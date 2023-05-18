const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { errorHandler } = require("../helpers/dbErrorHandler");

exports.signUp = (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_API_KEY);
  const user = new User(req.body.data);

  user.save(async (err, user) => {
    if (err) {
      return res.status(400).json({
        err: errorHandler(err),
      });
    }

    const token = jwt.sign({ _id: user.id }, process.env.JWT_SECRET);

    res.cookie("t", token, { expire: new Date() + 9999 });

    user.salt = undefined;
    user.hashed_password = undefined;

    const { _id, name, email, role } = user;

    await stripe.customers.create({
      name: name,
      email: email,
    });

    return res.json({
      token: token,
      user: {
        _id,
        email,
        name,
        role,
      },
    });
  });
};

exports.signIn = (req, res) => {
  const { email, password } = req.body.data;
  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found. Please, signup",
      });
    } else {
      if (!user.authenticate(password)) {
        return res.status(401).json({
          error: "Email and password doesn't match.",
        });
      }

      const token = jwt.sign({ _id: user.id }, process.env.JWT_SECRET);

      res.cookie("t", token, { expire: new Date() + 9999 });

      const { _id, name, email, role } = user;

      return res.json({
        token: token,
        user: {
          _id,
          email,
          name,
          role,
        },
      });
    }
  });
};

exports.signOut = (req, res) => {
  res.clearCookie("t");
  res.json({
    message: "Signout success",
  });
};

exports.requireSignIn = async function authMiddlware(req, res, next) {
  try {
    const Authorization =
      req.cookies["Authorization"] ||
      (req.header("Authorization")
        ? req.header("Authorization").split(" ")[1]
        : null);
    if (Authorization) {
      const secretKey = process.env.JWT_SECRET;
      const verificationResponse = jwt.verify(Authorization, secretKey);
      const userId = verificationResponse._id;
      const foundUser = await User.findOne({ _id: userId });

      if (foundUser) {
        req.data = foundUser;
        next();
      } else {
        res.status(401).json({
          error: "Wrong authentication token",
        });
      }
    } else {
      res.status(404).json({
        error: "Authentication token missing",
      });
    }
  } catch (error) {
    res.status(401).json({
      error: "Wrong authentication token",
    });
  }
};

exports.isAuth = (req, res, next) => {
  let user = req.data;

  if (!user) {
    res.status(403).json({
      error: "Access denied",
    });
  }

  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.data.role === 1) {
    return res.status(403).json({
      error: "Admin resource! Access denied",
    });
  }

  next();
};
