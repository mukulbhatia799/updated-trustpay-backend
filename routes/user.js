// backend/routes/user.js
const express = require('express');

const router = express.Router();
const zod = require("zod");
const { User, Account } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("../middleware");

const signupBody = zod.object({
    username: zod.string().email(),
    firstName: zod.string(),
    lastName: zod.string(),
    password: zod.string().min(6, "password length should be atleast 8 characters.")
})

router.post("/signup", async (req, res) => {
    const response = signupBody.safeParse(req.body)
    if (!response.success) {
        console.log("error occured:signup: ", response.error.message);
        return res.status(411).json({ 
            message: JSON.stringify(response.error.issues)
        })
    }

    const existingUser = await User.findOne({
        username: req.body.username
    })

    if (existingUser) {
        return res.status(411).json({
            message: "Email already taken"
        })
    }

    try {
        const user = await User.create({
            username: req.body.username,
            password: req.body.password,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
        })
        const userId = user._id;

        await Account.create({
            userId,
            balance: 1 + Math.random() * 10000
        })

        const token = jwt.sign({
            userId
        }, JWT_SECRET);

        res.json({
            message: "User created successfully",
            token: token
        })
    }catch(error) {
        console.log("errr:", error);
        res.json({messagee: "error occured", errorName: error.name});
    }
})


const signinBody = zod.object({
    username: zod.string().email(),
    password: zod.string()
})

router.post("/signin", async (req, res) => {
    const { success } = signinBody.safeParse(req.body)
    if (!success) {
        return res.status(411).json({
            message: "Incorrect inputs"
        })
    }

    const user = await User.findOne({
        username: req.body.username,
        password: req.body.password
    });

    if (user) {
        const token = jwt.sign({
            userId: user._id
        }, JWT_SECRET);

        res.json({
            token: token,
            message: "You just signed in!, when signed in token is again given to the user/assigned to user."
        })
        return;
    }

    res.status(411).json({
        message: "User not found/password is incorrect.",
        user
    })
})

const updateBody = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional(),
})

router.put("/", authMiddleware, async (req, res) => {
    const { success } = updateBody.safeParse(req.body)
    if (!success) {
        res.status(411).json({
            message: "Error while updating information"
        })
    }

    await User.updateOne(req.body, {
        id: req.userId
    })

    res.json({
        message: "Updated successfully"
    })
})

// used for searching the user in dashboard page. 
router.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";

    const users = await User.find({
        $or: [{             // checks whether the input typed by user is either firstName or lastName or not. If filter is empty, return all users.
            firstName: {
                "$regex": filter,
                "$options": "i"
            }
        }, {
            lastName: {
                "$regex": filter,
                "$options": "i"
            }
        }]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })
})

router.get("/verifytoken", (req, res) => {
    const token = req.query.jwtToken;
    console.log(`token from req query: ${token}`);
  
    if (!token) {
        return res.status(403).send('Token is required');
    }
  
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`decoded jwt token: ${decoded.userId}`);
        req.userId = decoded.userId;
        console.log(`req.userId after creation: ${req.userId}`);  
        const userId = req.userId;
        res.status(200).json({userId});
    } catch (error) {
        return res.status(401).send('Invalid or expired token');
    }
})

router.get("/finduser", async (req, res) => {
    const id = req.query.id;

    const user = await User.findById(id);
    console.log(`user: ${user}`);

    res.status(200).json({user});
})

module.exports = router;