// db-script.js
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const uri = "mongodb+srv://murugankanagaraj00_db_user:tDscMbZfoO4WCVmw@cluster0.mv5jmpi.mongodb.net/test";

const client = new MongoClient(uri);

async function exportAllCollections() {
  try {
    await client.connect();
    const db = client.db("test");

    // Create output folder
    const exportDir = path.join(process.cwd(), "Development_DB");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    // Get all collections
    const collections = await db.listCollections().toArray();

    for (const coll of collections) {
      const name = coll.name;
      console.log(`📦 Exporting collection: ${name}`);

      const data = await db.collection(name).find({}).toArray();
      const filePath = path.join(exportDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    }

    console.log("✅ All collections exported successfully to 'Development_DB/'");
  } catch (err) {
    console.error("❌ Error exporting collections:", err);
  } finally {
    await client.close();
  }
}

exportAllCollections();