import { Db, MongoClient, MongoClientOptions, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();
if (!process.env.ATLAS_CONN_STR) {
  throw new Error("ATLAS_CONN_STR is not defined");
}


export class DbManager {
  private static readonly BACKUP_DIR = "./backup";
  private static readonly DEFAULT_PING_INTERVAL = 5000;
  private static readonly DEFAULT_BAK_INTERVAL = 3600000;

  private pingClient;
  private connString;
  private mongoOpts: MongoClientOptions | undefined;

  private client: MongoClient | undefined;
  private db: Db | undefined;
  public collections: Map<string, any> = new Map();
  private collectionNames: Array<string> = [];

  private backupMode = false; // false = normal, true = backup
  private isReady = false;

  constructor(
    connString: string,
    collections: Array<string>,
    mongoOpts?: MongoClientOptions,
    options?: { pingInterval?: number, backupInterval?: number }
  ) {
    this.connString = connString;
    this.collectionNames = collections;
    this.mongoOpts = mongoOpts;

    this.pingClient = new MongoClient(connString, { maxPoolSize: 1 });
    this.pingClient.connect();

    setInterval(() => {
      if (this.isReady) this.pingAtlas()
    }, options?.pingInterval || DbManager.DEFAULT_PING_INTERVAL);

    setInterval(async () => {
      if (this.isReady) await this.createBackup();
    }, options?.backupInterval || DbManager.DEFAULT_BAK_INTERVAL);
  }

  public async init() {
    await this.reconnect(this.connString, this.mongoOpts);
    await this.createBackup();
    this.isReady = true;
  }

  public async reconnect(connString: string, opts?: MongoClientOptions) {
    this.isReady = false;
    if (this.client) {
      console.log("Closing previous connection");
      try {
        await this.client.close();
      } catch (e) {
        console.error("Failed to close previous connection", e);
      }
    }

    console.log(`Connecting to ${connString}`);
    try {
      this.client = new MongoClient(connString, opts);
      await this.client.connect();
      this.db = this.client.db("primary");
      this.collections = new Map();
      for (const c of this.collectionNames) {
        this.collections.set(c, this.db.collection(c));
      }
      console.log("Connected");
      this.isReady = true;
    } catch (e) {
      console.error("Failed to connect", e);
    }
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
    this.pingClient.db().command({ ping: 1 }).then((result) => {
      // expected answer: { ok: 1 }
      if (result.ok !== 1) {
        console.log("Ping failed");
        this.updateState(true);
      } else {
        // console.log("Ping successful");
        this.updateState(false);
      }
    }).catch((e) => {
      if (e instanceof Error) {
        console.error("MongoDB connection failed.", e.message);
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

    if (this.backupMode) {
      console.log("Failing over to local db backup");
      this.reconnect(this.getBackupConnectionString(), this.mongoOpts);
    }
    else {
      console.log("(Re-)connecting to primary database");
      this.reconnect(this.connString, this.mongoOpts);
    }
  }

  private async dump(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("Starting backup...");
      const mongodump = spawn("mongodump", ["--uri", this.connString, "-o", DbManager.BACKUP_DIR]);

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
      const mongorestore = spawn("mongorestore", ["--dir", DbManager.BACKUP_DIR, "--drop", "--host=localhost:27017"]);


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

