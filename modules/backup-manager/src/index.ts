import { MongoClient, MongoClientOptions, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { spawn } from "child_process";
import { DbStateListener } from "./dbStateListener";

dotenv.config();
if (!process.env.ATLAS_CONN_STR) {
  throw new Error("ATLAS_CONN_STR is not defined");
}


export class BackupManager {
  private static readonly BACKUP_DIR = "./backup";
  private static readonly DEFAULT_PING_INTERVAL = 5000;
  private static readonly DEFAULT_BAK_INTERVAL = 3600000;

  private atlasClient;
  private connString;
  private cb: DbStateListener;

  private backupMode = false; // false = normal, true = backup

  constructor(
    connString: string,
    cb: DbStateListener,
    options?: { pingInterval?: number, backupInterval?: number }
  ) {
    this.connString = connString;
    this.cb = cb;
    this.atlasClient = new MongoClient(connString, { maxPoolSize: 1 });
    this.atlasClient.connect();

    this.createBackup();
    setInterval(() => this.pingAtlas(),
      options?.pingInterval || BackupManager.DEFAULT_PING_INTERVAL);

    setInterval(async () => {
      await this.createBackup();
    }, options?.backupInterval || BackupManager.DEFAULT_BAK_INTERVAL);
  }

  private async createBackup(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.dump();
        await this.restore();
        resolve();
      } catch (e) {
        console.error("Failed to create backup", e);
        reject(e);
      }
    });
  }

  private pingAtlas(): void {
    this.atlasClient.db().command({ ping: 1 }).then((result) => {
      // expected answer: { ok: 1 }
      if (result.ok !== 1) {
        console.log("Ping failed");
      } else {
        console.log("Ping successful");
      }
      throw new Error("TESTING");
      this.updateState(false);
    }).catch((e) => {
      if (e instanceof Error) {
        console.error("MongoDB connection failed. Failover to backup.", e.message);
      }
      else {
        console.error("Unknown error: ", e);
      }
      this.updateState(true);
    });

  }

  private updateState(newState: boolean): void {
    if (this.backupMode === newState) return;

    this.backupMode = newState;

    if (this.backupMode)
      this.cb.onSwitchDb(this.getBackupConnectionString());
    else
      this.cb.onSwitchDb(this.connString);
  }

  private async dump(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("Starting backup...");
      const mongodump = spawn("mongodump", ["--uri", this.connString, "-o", BackupManager.BACKUP_DIR]);

      mongodump.stdout.on("data", (data: Buffer) => {
        console.log(`mongdump stdout: ${data}`);
      });
      mongodump.stderr.on("data", (data: Buffer) => {
        console.error(`mongdump stderr: ${data}`);
      });

      mongodump.on("close", (code: number) => {
        if (code === 0) {
          console.log("Backup completed successfully");
          resolve();
        } else {
          const errorMessage = `Backup failed with error code ${code}`;
          console.log(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });
  }

  private async restore(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("Starting restore...");
      const mongorestore = spawn("mongorestore", ["--dir", BackupManager.BACKUP_DIR, "--drop", "--host=localhost:27017"]);


      mongorestore.stdout.on("data", (data: Buffer) => {
        console.log(`mongdump stdout: ${data}`);
      });
      mongorestore.stderr.on("data", (data: Buffer) => {
        console.error(`mongdump stderr: ${data}`);
      });

      mongorestore.on("close", (code: number) => {
        if (code === 0) {
          console.log("Restore completed successfully");
          resolve();
        } else {
          const errorMessage = `Restore failed with error code ${code}`;
          console.log(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });

  }

  private getBackupConnectionString(): string {
    return `mongodb://localhost:27017`
  }
}








