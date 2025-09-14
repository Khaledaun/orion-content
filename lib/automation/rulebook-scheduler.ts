import cron from "node-cron";
import { logger } from "@/lib/logger";

interface RulebookUpdate {
  id: string;
  siteId: string;
  scheduledAt: Date;
  status: "pending" | "running" | "completed" | "failed";
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
  };
}

class RulebookScheduler {
  private updates: Map<string, RulebookUpdate> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeScheduler();
  }

  private initializeScheduler() {
    // Run bi-weekly on Mondays at 9 AM
    cron.schedule("0 9 * * 1", async () => {
      const now = new Date();
      const weekNumber = this.getWeekNumber(now);

      // Only run on even weeks (bi-weekly)
      if (weekNumber % 2 === 0) {
        await this.processBiWeeklyUpdates();
      }
    });

    logger.info(
      "Rulebook scheduler initialized - bi-weekly updates on even weeks",
    );
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async scheduleRulebookUpdate(
    siteId: string,
    changes: RulebookUpdate["changes"],
  ): Promise<string> {
    const updateId = `rulebook_${siteId}_${Date.now()}`;
    const scheduledAt = this.getNextBiWeeklyDate();

    const update: RulebookUpdate = {
      id: updateId,
      siteId,
      scheduledAt,
      status: "pending",
      changes,
    };

    this.updates.set(updateId, update);

    logger.info(`Scheduled rulebook update for site ${siteId}`, {
      updateId,
      scheduledAt: scheduledAt.toISOString(),
      changesCount:
        changes.added.length + changes.modified.length + changes.removed.length,
    });

    return updateId;
  }

  private getNextBiWeeklyDate(): Date {
    const now = new Date();
    const currentWeek = this.getWeekNumber(now);

    // Find next even week
    let targetWeek = currentWeek;
    if (targetWeek % 2 !== 0) {
      targetWeek += 1;
    } else {
      targetWeek += 2;
    }

    // Calculate the date for the target week (Monday at 9 AM)
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const targetDate = new Date(firstDayOfYear);
    targetDate.setDate(firstDayOfYear.getDate() + (targetWeek - 1) * 7);

    // Set to Monday 9 AM
    const dayOfWeek = targetDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    targetDate.setDate(targetDate.getDate() + daysToMonday);
    targetDate.setHours(9, 0, 0, 0);

    return targetDate;
  }

  private async processBiWeeklyUpdates() {
    if (this.isRunning) {
      logger.warn("Rulebook update process already running, skipping");
      return;
    }

    this.isRunning = true;
    logger.info("Starting bi-weekly rulebook updates");

    try {
      const pendingUpdates = Array.from(this.updates.values())
        .filter((update) => update.status === "pending")
        .filter((update) => update.scheduledAt <= new Date());

      logger.info(
        `Processing ${pendingUpdates.length} pending rulebook updates`,
      );

      for (const update of pendingUpdates) {
        await this.processRulebookUpdate(update);
      }

      logger.info("Completed bi-weekly rulebook updates");
    } catch (error) {
      logger.error("Error during bi-weekly rulebook updates", { error });
    } finally {
      this.isRunning = false;
    }
  }

  private async processRulebookUpdate(update: RulebookUpdate) {
    try {
      update.status = "running";
      this.updates.set(update.id, update);

      logger.info(
        `Processing rulebook update ${update.id} for site ${update.siteId}`,
      );

      // Simulate rulebook update process
      await this.applyRulebookChanges(update.siteId, update.changes);

      update.status = "completed";
      this.updates.set(update.id, update);

      logger.info(`Completed rulebook update ${update.id}`);
    } catch (error) {
      update.status = "failed";
      this.updates.set(update.id, update);

      logger.error(`Failed to process rulebook update ${update.id}`, {
        error,
        siteId: update.siteId,
      });
    }
  }

  private async applyRulebookChanges(
    siteId: string,
    changes: RulebookUpdate["changes"],
  ) {
    // Simulate API calls to update site rulebook
    logger.info(`Applying rulebook changes to site ${siteId}`, {
      added: changes.added.length,
      modified: changes.modified.length,
      removed: changes.removed.length,
    });

    // Add artificial delay to simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Here you would implement actual rulebook update logic:
    // 1. Fetch current site configuration
    // 2. Apply changes to rulebook
    // 3. Validate changes
    // 4. Deploy updated rulebook
    // 5. Monitor for issues
  }

  getScheduledUpdates(): RulebookUpdate[] {
    return Array.from(this.updates.values());
  }

  getUpdateStatus(updateId: string): RulebookUpdate | undefined {
    return this.updates.get(updateId);
  }

  cancelUpdate(updateId: string): boolean {
    const update = this.updates.get(updateId);
    if (update && update.status === "pending") {
      this.updates.delete(updateId);
      logger.info(`Cancelled rulebook update ${updateId}`);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const rulebookScheduler = new RulebookScheduler();
