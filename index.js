const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 7000;

//middleware
app.use(cors());
app.use(express.json());
const env = process.env;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${env.DB_USER}:${env.DB_PASS}@cluster0.bwilrcc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const verifyJWT = (req, res, next) => {
  console.log("get verify jwt");
  console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  console.log("check  the split token ", token);
  jwt.verify(token, process.env.DB_ACCESS_TOKEN, (error, decoded) => {
    if(error){
      return res.send({error:true, message:'unauthorized access'})
    }
    req.decoded=decoded;
    next();
  });
};



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const carService = client.db("carservice").collection("service");
    const serviceBooking = client.db("carservice").collection("booking");

    //token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    app.get("/services", async (req, res) => {
      const cursor = carService.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/checkout", verifyJWT, async (req, res) => {
      //  console.log(req.headers.authorization );
      //  console.log(req.query.email);
      const decoded=req.decoded;
      console.log("decoded value " ,decoded);
      if(decoded.email !== req.query.email){
        return res.status(403).send({error:1, message:"unauthorized access"})
      }
      let query = {};
      if (req.query?.email) {
        query = {
          email: req.query.email,
        };
      }
      const result = await serviceBooking.find(query).toArray();
      res.send(result);
    });
    app.delete("/checkout/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceBooking.deleteOne(query);
      console.log("delete successful");
      res.send(result);
    });
    app.patch("/checkout/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateData = req.body;
      console.log(updateData);
      const updateDoc = {
        $set: {
          status: updateData.status,
        },
      };
      const result = await serviceBooking.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await serviceBooking.insertOne(booking);
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: {
          title: 1,
          price: 1,
          service_id: 1,
          img: 1,
        },
      };
      const result = await carService.findOne(query, options);
      res.send(result);
    });
    // Send a ping to confirm a successful connection tis is for the best dectice
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car service  server is runnig");
});

app.listen(port, () => {
  console.log(`car service server is running on port ${port}`);
});
