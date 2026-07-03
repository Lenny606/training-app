import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createDb } from '../db/client'
import type { DbClient } from '../db/client'
import { runMigrations } from '../db/migrate'
import { seedDefaultPlansForOwner } from '../db/seed'
import { DEFAULT_PLANS } from '../domain/plans'
import { PlanNotFoundError, PlanValidationError } from './plan-repository'
import { SqlitePlanRepository } from './sqlite-plan-repository'
import { SqliteUserRepository } from './sqlite-user-repository'

async function makeOwner(db: DbClient, email: string): Promise<string> {
  const users = new SqliteUserRepository(db)
  const user = await users.create({ email, passwordHash: 'x' })
  return user.id
}

describe('SqlitePlanRepository', () => {
  let repository: SqlitePlanRepository
  let ownerId: string

  beforeEach(async () => {
    const db = createDb(':memory:')
    runMigrations(db)
    ownerId = await makeOwner(db, 'owner@example.com')
    seedDefaultPlansForOwner(ownerId, db)
    repository = new SqlitePlanRepository(db)
  })

  async function firstPlanId(): Promise<string> {
    const plans = await repository.list(ownerId)
    return plans[0].id
  }

  describe('list / seed', () => {
    it('returns the cloned DEFAULT_PLANS with ordered activities', async () => {
      const plans = await repository.list(ownerId)
      expect(plans).toHaveLength(DEFAULT_PLANS.length)

      const first = plans[0]
      expect(first.name).toBe(DEFAULT_PLANS[0].name)
      expect(first.activities.map((a) => a.name)).toEqual(
        DEFAULT_PLANS[0].activities.map((a) => a.name),
      )
    })

    it('omits null optional fields rather than exposing them', async () => {
      const plans = await repository.list(ownerId)
      const hiit = plans.find((p) => p.name === DEFAULT_PLANS[2].name)
      const restActivity = hiit?.activities.find((a) => a.type === 'rest')
      expect(restActivity).toBeDefined()
      expect(restActivity).not.toHaveProperty('sets', null)
      expect(restActivity?.sets).toBeUndefined()
    })
  })

  describe('getById', () => {
    it('returns a plan when it exists and is owned', async () => {
      const id = await firstPlanId()
      const plan = await repository.getById(id, ownerId)
      expect(plan?.id).toBe(id)
    })

    it('returns null when missing', async () => {
      expect(await repository.getById('nope', ownerId)).toBeNull()
    })
  })

  describe('create', () => {
    it('assigns a plan id and generates missing activity ids', async () => {
      const created = await repository.create(
        {
          name: 'New Workout',
          description: 'New',
          daysPerWeek: 4,
          activities: [
            { name: 'Bench', duration: 120, type: 'exercise' },
            { id: 'act-fixed', name: 'Rest', duration: 60, type: 'rest' },
          ],
        },
        ownerId,
      )

      expect(created.id).toMatch(/^plan-/)
      expect(created.activities[0].id).toMatch(/^act-/)
      expect(created.activities[1].id).toBe('act-fixed')

      const persisted = await repository.getById(created.id, ownerId)
      expect(persisted?.activities).toHaveLength(2)
      expect(persisted?.activities[0].name).toBe('Bench')
    })

    it('throws PlanValidationError on invalid input', async () => {
      await expect(
        repository.create(
          {
            name: '',
            description: '',
            daysPerWeek: 8,
            activities: [{ name: '', duration: -10, type: 'exercise' }],
          },
          ownerId,
        ),
      ).rejects.toThrow(PlanValidationError)
    })
  })

  describe('update', () => {
    it('merges scalar patch fields, preserving the rest', async () => {
      const id = await firstPlanId()
      const updated = await repository.update(
        id,
        { name: 'Updated Push', daysPerWeek: 5 },
        ownerId,
      )

      expect(updated.name).toBe('Updated Push')
      expect(updated.daysPerWeek).toBe(5)
      expect(updated.description).toBe(DEFAULT_PLANS[0].description)
      expect(updated.activities.map((a) => a.name)).toEqual(
        DEFAULT_PLANS[0].activities.map((a) => a.name),
      )
    })

    it('replaces and reorders activities when provided', async () => {
      const id = await firstPlanId()
      const updated = await repository.update(
        id,
        {
          activities: [
            { id: 'a-new', name: 'Squat', duration: 100, type: 'exercise' },
            { name: 'Pause', duration: 30, type: 'rest' },
          ],
        },
        ownerId,
      )

      expect(updated.activities).toHaveLength(2)

      const persisted = await repository.getById(id, ownerId)
      expect(persisted?.activities.map((a) => a.name)).toEqual([
        'Squat',
        'Pause',
      ])
      expect(persisted?.activities[0].id).toBe('a-new')
    })

    it('throws PlanNotFoundError for a missing plan', async () => {
      await expect(
        repository.update('nope', { name: 'X' }, ownerId),
      ).rejects.toThrow(PlanNotFoundError)
    })

    it('validates merged input', async () => {
      const id = await firstPlanId()
      await expect(
        repository.update(id, { name: '' }, ownerId),
      ).rejects.toThrow(PlanValidationError)
    })
  })

  describe('remove', () => {
    it('deletes the plan and cascades to activities', async () => {
      const id = await firstPlanId()
      await repository.remove(id, ownerId)
      expect(await repository.getById(id, ownerId)).toBeNull()
    })

    it('is idempotent for a missing plan', async () => {
      await expect(repository.remove('nope', ownerId)).resolves.not.toThrow()
    })
  })

  describe('reorder', () => {
    it('seeds plans in DEFAULT_PLANS order', async () => {
      const plans = await repository.list(ownerId)
      expect(plans.map((p) => p.name)).toEqual(DEFAULT_PLANS.map((p) => p.name))
    })

    it('appends newly created plans to the end of the ordering', async () => {
      const created = await repository.create(
        { name: 'Zzz Last', description: '', daysPerWeek: 3, activities: [] },
        ownerId,
      )
      const plans = await repository.list(ownerId)
      expect(plans[plans.length - 1].id).toBe(created.id)
    })

    it('persists a new ordering that survives a reload', async () => {
      const before = await repository.list(ownerId)
      const reversed = [...before].reverse().map((p) => p.id)
      await repository.reorder(reversed, ownerId)

      const after = await repository.list(ownerId)
      expect(after.map((p) => p.id)).toEqual(reversed)
    })

    it('ignores ids the owner does not own', async () => {
      const db = (repository as unknown as { db: DbClient }).db
      const otherId = await makeOwner(db, 'other@example.com')
      const victim = await repository.list(ownerId)
      const victimIds = victim.map((p) => p.id)

      // Intruder tries to reorder the victim's plans — no-op, order unchanged.
      await repository.reorder([...victimIds].reverse(), otherId)
      const after = await repository.list(ownerId)
      expect(after.map((p) => p.id)).toEqual(victimIds)
    })
  })

  describe('owner scoping', () => {
    it('never exposes or mutates another owner’s plans', async () => {
      const db = (repository as unknown as { db: DbClient }).db
      const otherId = await makeOwner(db, 'intruder@example.com')

      // intruder starts with no plans
      expect(await repository.list(otherId)).toHaveLength(0)

      const victimPlanId = await firstPlanId()
      // cannot read
      expect(await repository.getById(victimPlanId, otherId)).toBeNull()
      // cannot update
      await expect(
        repository.update(victimPlanId, { name: 'hijacked' }, otherId),
      ).rejects.toThrow(PlanNotFoundError)
      // cannot delete — owner still has it afterwards
      await repository.remove(victimPlanId, otherId)
      expect(await repository.getById(victimPlanId, ownerId)).not.toBeNull()
    })
  })

  describe('media support', () => {
    it('links newly uploaded media to activity on plan update, returns it, and cleans up when removed', async () => {
      const db = (repository as unknown as { db: DbClient }).db
      const { media: mediaTable } = await import('../db/schema')

      const planId = await firstPlanId()
      const planBefore = await repository.getById(planId, ownerId)
      expect(planBefore).not.toBeNull()
      const activity = planBefore!.activities[0]
      expect(activity).toBeDefined()

      // 1. Simulate file upload by inserting a media row with activityId = null
      const mediaId = 'media-test-1'
      db.insert(mediaTable)
        .values({
          id: mediaId,
          userId: ownerId,
          activityId: null,
          fileName: 'file-test-1.png',
          originalName: 'test.png',
          mimeType: 'image/png',
          fileSize: 1024,
          createdAt: new Date(),
        })
        .run()

      // Create a dummy file on disk so the repository's unlinkSync won't fail with ENOENT
      const fs = await import('node:fs')
      const path = await import('node:path')
      const { getUploadDir } = await import('../utils/upload')
      const uploadDir = getUploadDir()
      fs.mkdirSync(uploadDir, { recursive: true })
      fs.writeFileSync(path.join(uploadDir, 'file-test-1.png'), 'dummy')

      // Verify it exists in DB
      const inserted = db
        .select()
        .from(mediaTable)
        .where(eq(mediaTable.id, mediaId))
        .get()
      expect(inserted).toBeDefined()
      expect(inserted?.activityId).toBeNull()

      // 2. Link the media to the activity via update
      const updatedActivity = {
        ...activity,
        media: [
          {
            id: mediaId,
            fileName: 'file-test-1.png',
            originalName: 'test.png',
            mimeType: 'image/png',
            fileSize: 1024,
          },
        ],
      }

      const updatedPlan = await repository.update(
        planId,
        {
          activities: [updatedActivity, ...planBefore!.activities.slice(1)],
        },
        ownerId,
      )

      // Verify that update returns the media
      expect(updatedPlan.activities[0].media).toHaveLength(1)
      expect(updatedPlan.activities[0].media![0].id).toBe(mediaId)

      // Verify it is linked in the database
      const linked = db
        .select()
        .from(mediaTable)
        .where(eq(mediaTable.id, mediaId))
        .get()
      expect(linked?.activityId).toBe(activity.id)

      // Verify getById loads it
      const loadedPlan = await repository.getById(planId, ownerId)
      expect(loadedPlan?.activities[0].media).toHaveLength(1)
      expect(loadedPlan?.activities[0].media![0].id).toBe(mediaId)

      // 3. Remove the media via update and check that the DB record is deleted
      const noMediaActivity = {
        ...activity,
        media: [],
      }

      const planAfterRemoval = await repository.update(
        planId,
        {
          activities: [noMediaActivity, ...planBefore!.activities.slice(1)],
        },
        ownerId,
      )

      expect(planAfterRemoval.activities[0].media).toBeUndefined()

      // Verify the media record was deleted from the database
      const deletedRecord = db
        .select()
        .from(mediaTable)
        .where(eq(mediaTable.id, mediaId))
        .get()
      expect(deletedRecord).toBeUndefined()
    })
  })
})
