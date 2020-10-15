const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
require('dotenv').config()

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ioamv.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express()

app.use(bodyParser.json());
app.use(cors());
const admin = require("firebase-admin");

var serviceAccount = require("./config/creative-agency-71b3d-firebase-adminsdk-nkw3s-2ba25a455c.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://creative-agency-71b3d.firebaseio.com"
});

app.use(express.static('services'));
app.use(fileUpload());

const port = 5000;

app.get('/', (req, res) => {
    res.send("hello from db it's working working")
})

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const serviceCollection = client.db(process.env.DB_NAME).collection(process.env.DB_COLLS);
    const adminCollection = client.db(process.env.DB_NAME).collection(process.env.DB_COLLA);
    const orderedServiceCollection = client.db(process.env.DB_NAME).collection(process.env.DB_COLLO);
    const reviewCollection = client.db(process.env.DB_NAME).collection(process.env.DB_COLLR);
    app.post('/addAdmin', (req, res) => {
        const admin = req.body;

        adminCollection.insertOne(admin)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    });

    app.post('/addServices', (req, res) => {
        const file = req.files.file;
        const title = req.body.title;
        const description = req.body.description;
        const newImg = file.data;
        const encImg = newImg.toString('base64');

        var image = {
            contentType: file.mimetype,
            size: file.size,
            img: Buffer.from(encImg, 'base64')
        };

        serviceCollection.insertOne({ title, description, image })
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    });

    app.get('/services', (req, res) => {
        serviceCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            });
    });

    app.post('/orderedService', (req, res) => {
        let image = "No image";
        if (req.files != null) {
            const file = req.files.file;
            const newImg = file.data;
            const encImg = newImg.toString('base64');

            image = {
                contentType: file.mimetype,
                size: file.size,
                img: Buffer.from(encImg, 'base64')
            };
        }

        const name = req.body.name;
        const email = req.body.email;
        const service = req.body.service;
        const details = req.body.details;
        const price = req.body.price;
        const status = req.body.status;
        const serviceImage = req.body.serviceImage;
        const serviceDescription = req.body.serviceDescription;

        orderedServiceCollection.insertOne({ name, email, service, details, price, status, serviceImage, serviceDescription, image })
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    });

    app.post('/addReview', (req, res) => {
        const review = req.body;
        reviewCollection.insertOne(review)
            .then(result => {
                res.send(result.insertedCount > 0)
            })

    });

    app.get('/reviews', (req, res) => {
        reviewCollection.find({}).limit(3)
            .toArray((err, documents) => {
                res.send(documents);
            });
    });

    app.get('/userServices', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    let tokenEmail = decodedToken.email;

                    if (tokenEmail == req.query.email) {
                        orderedServiceCollection.find({ email: req.query.email })
                            .toArray((err, document) => {
                                res.status(200).send(document);
                            })
                    }
                    else {
                        res.status(401).send("un-authorised access");
                    }

                }).catch(function (error) {
                    res.status(401).send("un-authorised access")
                });
        }
        else {
            res.status(401).send("un-authorised access");
        }
    });

    app.get('/getServiceData/:serviceId', (req, res) => {
        serviceCollection.find({ _id: ObjectID(req.params.serviceId) })
            .toArray((err, documents) => {
                res.send(documents);
            });
    });

    app.post('/isAdmin', (req, res) => {
        const email = req.body.email;
        adminCollection.find({ email: email })
            .toArray((err, admins) => {
                res.send(admins.length > 0);
            })
    });

    app.get('/allOrders', (req, res) => {
        orderedServiceCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    });

    app.patch('/updateStatus/:id', (req, res) => {
        orderedServiceCollection.updateOne({ _id: ObjectID(req.params.id) },
            {
                $set: { status: req.body.status }
            })
            .then(result => {
                res.send(result.modifiedCount > 0);
            })
    });
    app.get('/status/:id', (req, res) => {
        orderedServiceCollection.find({ _id: ObjectID(req.params.id) })
            .toArray((err, documents) => {
                res.send(documents);
            });
    });

});


app.listen(process.env.PORT || port)