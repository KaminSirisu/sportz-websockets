import { Router } from 'express';
import { desc } from 'drizzle-orm';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { getMatchStatus } from '../utils/match-status.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if(!parsed.success) {
        return res.status(400).json({ error: 'Invalid query.', details: parsed.error.issues });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit);

        res.json({ data });

    } catch (e) {
        res.status(500).json({ error: 'Failed to list matches.', details: e ?? 'Unknown error' });
    }
});

matchRouter.post('/', async (req, res) => {
    if (req.body == null) {
        return res.status(400).json({
            error: 'Invalid payload.',
            details: 'Request body is required and must be valid JSON with Content-Type: application/json.',
        });
    }

    const parsed = createMatchSchema.safeParse(req.body);
    
    if(!parsed.success) {
        return res.status(400).json({
            error: 'Invalid payload.',
            details: parsed.error.issues ,
        });
    }

    const { startTime, endTime, homeScore, awayScore } = parsed.data;

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime),
        }).returning();

        if(res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event);
        }

        res.status(201).json({ data: event});
    } catch (e) {
        console.error('Failed to create match:', e);
        res.status(500).json({
            error: 'Failed to create match.',
            details: {
                message: e?.message ?? 'Unknown error',
                code: e?.code,
                detail: e?.detail,
                hint: e?.hint,
                where: e?.where,
                table: e?.table,
                column: e?.column,
                constraint: e?.constraint,
            },
        });
    }
})
