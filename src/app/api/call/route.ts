import { NextResponse } from "next/server";
import { isRedisConfigured, kvGetJson, kvSetJson } from "@/lib/kvStore";

export interface CallParticipant {
  id: string;
  nickname: string;
  isMuted?: boolean;
  isDeafened?: boolean;
}

export interface CallSession {
  callId: string;
  convId: string;
  hostId: string;
  status: "ACTIVE" | "ENDED";
  participants: CallParticipant[];
  handshakeId: string;
  offererId?: string;
  offer?: unknown;
  answer?: unknown;
  renegotiateNonce?: number;
  renegotiateFrom?: string;
  renegotiateOffer?: unknown;
  renegotiateAnswer?: unknown;
  candidatesByUser: Record<string, unknown[]>;
  updatedAt: number;
}

export async function GET(req: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const convIdsParam = searchParams.get("convIds");
  const userIdParam = searchParams.get("userId");
  const convIdParam = searchParams.get("convId");
  if (convIdsParam !== null || (userIdParam && !convIdParam)) {
    try {
      const idSet = new Set(
        (convIdsParam || "").split(",").filter(Boolean).slice(0, 200)
      );
      if (userIdParam) {
        const directConvId = await kvGetJson<string>(`user_call:${userIdParam}`);
        if (directConvId) idSet.add(directConvId);
      }
      const ids = Array.from(idSet);
      const calls = await Promise.all(
        ids.map((id) => kvGetJson<CallSession>(`call:${id}`))
      );
      const seenCallIds = new Set<string>();
      const activeCalls = calls.filter((c): c is CallSession => {
        if (
          !c ||
          c.status !== "ACTIVE" ||
          (c.participants?.length || 0) === 0 ||
          Date.now() - c.updatedAt >= 25 * 1000
        ) {
          return false;
        }
        if (seenCallIds.has(c.callId)) return false;
        seenCallIds.add(c.callId);
        return true;
      });
      return NextResponse.json(
        { ok: true, activeCalls },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  const convId = searchParams.get("convId");
  const viewerUserId = searchParams.get("userId") || "";
  const isViewerInCall = searchParams.get("inCall") === "1";
  if (!convId) {
    return NextResponse.json(
      { ok: false, error: "convId gerekli" },
      { status: 400 }
    );
  }
  try {
    let resolvedConvId = convId;
    let call = await kvGetJson<CallSession>(`call:${resolvedConvId}`);
    if (
      (!call ||
        call.status === "ENDED" ||
        (call.participants?.length || 0) === 0 ||
        Date.now() - call.updatedAt > 25 * 1000) &&
      viewerUserId
    ) {
      const mappedConvId = await kvGetJson<string>(`user_call:${viewerUserId}`);
      if (mappedConvId && mappedConvId !== resolvedConvId) {
        const mappedCall = await kvGetJson<CallSession>(`call:${mappedConvId}`);
        if (
          mappedCall &&
          mappedCall.status === "ACTIVE" &&
          (mappedCall.participants?.length || 0) > 0 &&
          Date.now() - mappedCall.updatedAt <= 25 * 1000
        ) {
          resolvedConvId = mappedConvId;
          call = mappedCall;
        }
      }
    }
    if (
      !call ||
      call.status === "ENDED" ||
      (call.participants?.length || 0) === 0 ||
      Date.now() - call.updatedAt > 25 * 1000
    ) {
      return NextResponse.json(
        { ok: true, call: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (
      isViewerInCall &&
      viewerUserId &&
      call.participants.some((p) => p.id === viewerUserId) &&
      Date.now() - call.updatedAt > 3000
    ) {
      call = { ...call, updatedAt: Date.now() };
      await kvSetJson(`call:${resolvedConvId}`, call);
    }

    const sigScope = call.handshakeId || call.callId;
    let pairSignals: Record<
      string,
      {
        offererId?: string;
        offer?: unknown;
        answer?: unknown;
        renegotiateNonce?: number;
        renegotiateFrom?: string;
        renegotiateOffer?: unknown;
        renegotiateAnswer?: unknown;
        peerCandidates: unknown[];
      }
    > = {};

    if (viewerUserId && call.participants.length >= 2) {
      const others = call.participants.filter((p) => p.id !== viewerUserId);
      const pairResults = await Promise.all(
        others.map(async (peer) => {
          const pairKey = [viewerUserId, peer.id].sort().join("__");
          const [offerObj, answerObj, renegObj, peerCands] = await Promise.all([
            kvGetJson<{ offererId?: string; sdp?: unknown }>(
              `call_pair_offer:${resolvedConvId}:${sigScope}:${pairKey}`
            ),
            kvGetJson<{ sdp?: unknown }>(
              `call_pair_answer:${resolvedConvId}:${sigScope}:${pairKey}`
            ),
            kvGetJson<{
              nonce?: number;
              from?: string;
              offer?: unknown;
              answer?: unknown;
            }>(`call_pair_reneg:${resolvedConvId}:${sigScope}:${pairKey}`),
            kvGetJson<unknown[]>(
              `call_pair_cands:${resolvedConvId}:${sigScope}:${pairKey}:${peer.id}`
            ),
          ]);
          return {
            peerId: peer.id,
            signal: {
              offererId: offerObj?.offererId,
              offer: offerObj?.sdp,
              answer: answerObj?.sdp,
              renegotiateNonce: renegObj?.nonce,
              renegotiateFrom: renegObj?.from,
              renegotiateOffer: renegObj?.offer,
              renegotiateAnswer: renegObj?.answer,
              peerCandidates: Array.isArray(peerCands) ? peerCands : [],
            },
          };
        })
      );
      pairSignals = Object.fromEntries(
        pairResults.map((r) => [r.peerId, r.signal])
      );
    }

    return NextResponse.json(
      { ok: true, call: { ...call, pairSignals } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
    const body = (await req.json()) as {
      action:
        | "START"
        | "JOIN"
        | "LEAVE"
        | "END"
        | "OFFER"
        | "ANSWER"
        | "CANDIDATE"
        | "CANDIDATES"
        | "RENEGOTIATE_OFFER"
        | "RENEGOTIATE_ANSWER"
        | "PAIR_OFFER"
        | "PAIR_ANSWER"
        | "PAIR_CANDIDATES"
        | "PAIR_RENEGOTIATE_OFFER"
        | "PAIR_RENEGOTIATE_ANSWER"
        | "PARTICIPANT_STATE";
      convId: string;
      callId?: string;
      handshakeId?: string;
      userId?: string;
      peerId?: string;
      nickname?: string;
      isMuted?: boolean;
      isDeafened?: boolean;
      targetUserIds?: string[];
      sdp?: unknown;
      candidate?: unknown;
      candidates?: unknown[];
    };

    const {
      action,
      convId,
      userId = "",
      nickname = "Kullanıcı",
      targetUserIds = [],
    } = body;
    if (!convId || !action) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    let resolvedConvId = convId;
    let key = `call:${resolvedConvId}`;
    let existing = await kvGetJson<CallSession>(key);
    const now = Date.now();

    // Kullanıcının davet edildiği aktif bir arama başka bir convId altında açıksa onu bul ve birleştir
    if (
      (!existing ||
        existing.status !== "ACTIVE" ||
        (existing.participants?.length || 0) === 0 ||
        now - (existing.updatedAt || 0) >= 25 * 1000) &&
      userId &&
      (action === "START" || action === "JOIN" || action === "LEAVE" || action === "END")
    ) {
      const mappedConvId = await kvGetJson<string>(`user_call:${userId}`);
      if (mappedConvId && mappedConvId !== resolvedConvId) {
        const mappedCall = await kvGetJson<CallSession>(`call:${mappedConvId}`);
        if (
          mappedCall &&
          mappedCall.status === "ACTIVE" &&
          (mappedCall.participants?.length || 0) > 0 &&
          now - (mappedCall.updatedAt || 0) < 25 * 1000
        ) {
          resolvedConvId = mappedConvId;
          key = `call:${resolvedConvId}`;
          existing = mappedCall;
        }
      }
    }

    if (action === "START") {
      const existingParticipants = Array.isArray(existing?.participants)
        ? existing.participants
        : [];
      // Eğer halihazırda aktif bir arama varsa ona katıl
      if (
        existing &&
        existing.status === "ACTIVE" &&
        existingParticipants.length > 0 &&
        now - (existing.updatedAt || 0) < 25 * 1000
      ) {
        const alreadyIn = existingParticipants.some((p) => p.id === userId);
        const nextParticipants = alreadyIn
          ? existingParticipants.map((p) =>
              p.id === userId
                ? {
                    ...p,
                    isMuted: Boolean(body.isMuted),
                    isDeafened: Boolean(body.isDeafened),
                  }
                : p
            )
          : [
              ...existingParticipants,
              {
                id: userId,
                nickname,
                isMuted: Boolean(body.isMuted),
                isDeafened: Boolean(body.isDeafened),
              },
            ];
        const needsNewHandshake = !alreadyIn && nextParticipants.length >= 2;
        const updated: CallSession = {
          ...existing,
          participants: nextParticipants,
          handshakeId: needsNewHandshake
            ? `hs_${now}_${Math.random().toString(36).slice(2, 7)}`
            : existing.handshakeId,
          offer: needsNewHandshake ? undefined : existing.offer,
          answer: needsNewHandshake ? undefined : existing.answer,
          offererId: needsNewHandshake ? undefined : existing.offererId,
          candidatesByUser: needsNewHandshake ? {} : existing.candidatesByUser,
          updatedAt: now,
        };
        await kvSetJson(key, updated);
        if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
          await Promise.all(
            targetUserIds
              .filter((uid) => uid && uid !== userId)
              .map((uid) => kvSetJson(`user_call:${uid}`, convId))
          );
        }
        return NextResponse.json({ ok: true, call: updated });
      }

      const session: CallSession = {
        callId: body.callId || `call_${now}`,
        convId: resolvedConvId,
        hostId: userId,
        status: "ACTIVE",
        participants: [
          {
            id: userId,
            nickname,
            isMuted: Boolean(body.isMuted),
            isDeafened: Boolean(body.isDeafened),
          },
        ],
        handshakeId: `hs_${now}_${Math.random().toString(36).slice(2, 7)}`,
        candidatesByUser: {},
        updatedAt: now,
      };
      await kvSetJson(key, session);
      await kvSetJson(`user_call:${userId}`, resolvedConvId);
      if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
        await Promise.all(
          targetUserIds
            .filter((uid) => uid && uid !== userId)
            .map((uid) => kvSetJson(`user_call:${uid}`, resolvedConvId))
        );
      }
      return NextResponse.json({ ok: true, call: session });
    }

    if (!existing || existing.status !== "ACTIVE") {
      return NextResponse.json({ ok: true, call: null });
    }

    if (action === "JOIN") {
      const existingParticipants = Array.isArray(existing.participants)
        ? existing.participants
        : [];
      const alreadyIn = existingParticipants.some((p) => p.id === userId);
      const nextParticipants = alreadyIn
        ? existingParticipants.map((p) =>
            p.id === userId
              ? {
                  ...p,
                  isMuted: Boolean(body.isMuted),
                  isDeafened: Boolean(body.isDeafened),
                }
              : p
          )
        : [
            ...existingParticipants,
            {
              id: userId,
              nickname,
              isMuted: Boolean(body.isMuted),
              isDeafened: Boolean(body.isDeafened),
            },
          ];
      const hsId =
        nextParticipants.length >= 2 && !alreadyIn
          ? `hs_${now}_${Math.random().toString(36).slice(2, 7)}`
          : existing.handshakeId;
      const resetHandshake = hsId !== existing.handshakeId;
      const updated: CallSession = {
        ...existing,
        participants: nextParticipants,
        handshakeId: hsId,
        offer: resetHandshake ? undefined : existing.offer,
        answer: resetHandshake ? undefined : existing.answer,
        offererId: resetHandshake ? undefined : existing.offererId,
        candidatesByUser: resetHandshake ? {} : existing.candidatesByUser,
        updatedAt: now,
      };
      await kvSetJson(key, updated);
      return NextResponse.json({ ok: true, call: updated });
    }

    if (action === "PARTICIPANT_STATE" && userId) {
      const existingParticipants = Array.isArray(existing.participants)
        ? existing.participants
        : [];
      const updated: CallSession = {
        ...existing,
        participants: existingParticipants.map((p) =>
          p.id === userId
            ? {
                ...p,
                isMuted: Boolean(body.isMuted),
                isDeafened: Boolean(body.isDeafened),
              }
            : p
        ),
        updatedAt: now,
      };
      await kvSetJson(key, updated);
      return NextResponse.json({ ok: true, call: updated });
    }

    if (action === "LEAVE" || action === "END") {
      const existingParticipants = Array.isArray(existing.participants)
        ? existing.participants
        : [];
      const nextParticipants =
        action === "END"
          ? []
          : existingParticipants.filter((p) => p.id !== userId);
      if (nextParticipants.length === 0) {
        if (userId) {
          await kvSetJson(`user_call:${userId}`, "");
        }
        await Promise.all(
          existingParticipants.map((p) => kvSetJson(`user_call:${p.id}`, ""))
        );
        const ended: CallSession = {
          ...existing,
          status: "ENDED",
          participants: [],
          updatedAt: now,
        };
        await kvSetJson(key, ended);
        return NextResponse.json({ ok: true, call: null });
      }
      const updated: CallSession = {
        ...existing,
        hostId:
          existing.hostId === userId
            ? nextParticipants[0].id
            : existing.hostId,
        participants: nextParticipants,
        handshakeId: `hs_${now}_${Math.random().toString(36).slice(2, 7)}`,
        offer: undefined,
        answer: undefined,
        offererId: undefined,
        candidatesByUser: {},
        updatedAt: now,
      };
      await kvSetJson(key, updated);
      return NextResponse.json({ ok: true, call: updated });
    }

    // Sinyalizasyon adımları (handshakeId eşleşmeli)
    if (body.handshakeId && body.handshakeId !== existing.handshakeId) {
      return NextResponse.json({ ok: true, call: existing });
    }

    const hsId = body.handshakeId || existing.handshakeId;

    if (action === "OFFER") {
      await kvSetJson(`call_offer:${convId}:${hsId}`, {
        offererId: userId,
        sdp: body.sdp,
      });
      return NextResponse.json({
        ok: true,
        call: { ...existing, offererId: userId, offer: body.sdp },
      });
    }

    if (action === "ANSWER") {
      await kvSetJson(`call_answer:${convId}:${hsId}`, { sdp: body.sdp });
      return NextResponse.json({
        ok: true,
        call: { ...existing, answer: body.sdp },
      });
    }

    if (action === "CANDIDATE" && body.candidate && userId) {
      const candKey = `call_cands:${convId}:${hsId}:${userId}`;
      const prevList = (await kvGetJson<unknown[]>(candKey)) || [];
      await kvSetJson(candKey, [...prevList, body.candidate]);
      return NextResponse.json({ ok: true });
    }

    if (
      action === "CANDIDATES" &&
      Array.isArray(body.candidates) &&
      body.candidates.length > 0 &&
      userId
    ) {
      const candKey = `call_cands:${convId}:${hsId}:${userId}`;
      const prevList = (await kvGetJson<unknown[]>(candKey)) || [];
      await kvSetJson(candKey, [...prevList, ...body.candidates]);
      return NextResponse.json({ ok: true });
    }

    if (action === "RENEGOTIATE_OFFER") {
      const updated: CallSession = {
        ...existing,
        renegotiateNonce: (existing.renegotiateNonce || 0) + 1,
        renegotiateFrom: userId,
        renegotiateOffer: body.sdp,
        renegotiateAnswer: undefined,
        updatedAt: now,
      };
      await kvSetJson(key, updated);
      return NextResponse.json({ ok: true, call: updated });
    }

    if (action === "RENEGOTIATE_ANSWER") {
      const updated: CallSession = {
        ...existing,
        renegotiateAnswer: body.sdp,
        updatedAt: now,
      };
      await kvSetJson(key, updated);
      return NextResponse.json({ ok: true, call: updated });
    }

    // Mesh (çoklu katılımcı) çift bazlı sinyalizasyon — her yeni katılım/handshake için temiz anahtar kullan
    const targetPeerId = body.peerId || "";
    if (targetPeerId && userId) {
      const pairKey = [userId, targetPeerId].sort().join("__");
      const activeSigScope = existing.handshakeId || body.callId || existing.callId;

      if (action === "PAIR_OFFER") {
        await kvSetJson(
          `call_pair_offer:${resolvedConvId}:${activeSigScope}:${pairKey}`,
          { offererId: userId, sdp: body.sdp }
        );
        return NextResponse.json({ ok: true });
      }

      if (action === "PAIR_ANSWER") {
        await kvSetJson(
          `call_pair_answer:${resolvedConvId}:${activeSigScope}:${pairKey}`,
          { sdp: body.sdp }
        );
        return NextResponse.json({ ok: true });
      }

      if (
        action === "PAIR_CANDIDATES" &&
        Array.isArray(body.candidates) &&
        body.candidates.length > 0
      ) {
        const candKey = `call_pair_cands:${resolvedConvId}:${activeSigScope}:${pairKey}:${userId}`;
        const prevList = (await kvGetJson<unknown[]>(candKey)) || [];
        await kvSetJson(candKey, [...prevList, ...body.candidates]);
        return NextResponse.json({ ok: true });
      }

      if (action === "PAIR_RENEGOTIATE_OFFER") {
        const renegKey = `call_pair_reneg:${resolvedConvId}:${activeSigScope}:${pairKey}`;
        const prev =
          (await kvGetJson<{ nonce?: number }>(renegKey)) || {};
        await kvSetJson(renegKey, {
          nonce: (prev.nonce || 0) + 1,
          from: userId,
          offer: body.sdp,
          answer: undefined,
        });
        return NextResponse.json({ ok: true });
      }

      if (action === "PAIR_RENEGOTIATE_ANSWER") {
        const renegKey = `call_pair_reneg:${resolvedConvId}:${activeSigScope}:${pairKey}`;
        const prev =
          (await kvGetJson<{
            nonce?: number;
            from?: string;
            offer?: unknown;
          }>(renegKey)) || {};
        await kvSetJson(renegKey, {
          ...prev,
          answer: body.sdp,
        });
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: false, error: "Bilinmeyen aksiyon" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
