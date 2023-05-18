const User = require("../models/user");
const { Order } = require("../models/order");
const { errorHandler } = require("../helpers/dbErrorHandler");

exports.findUserById = (req, res, next, id) => {
  User.findById(id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    } else {
      req.profile = user;
      next();
    }
  });
};

exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  req.profile.salt = undefined;

  return res.json(req.profile);
};

exports.update = (req, res) => {
  User.findOneAndUpdate(
    { _id: req.profile._id },
    { $set: req.body },
    { new: true },
    (err, user) => {
      if (err) {
        return res.status(400).json({
          error: "You are not authorized to perform this action",
        });
      } else {
        user.hashed_password = undefined;
        user.salt = undefined;

        res.json(user);
      }
    }
  );
};

exports.addOrderToUserHistory = (req, res, next) => {
  try {
    let history = [];

    req.body.data.products.forEach((item) => {
      history.push({
        _id: item._id,
        name: item.name,
        description: item.description,
        category: item.category,
        quantity: item.count,
        amount: req.body.data.amount,
      });
    });

    User.findOneAndUpdate(
      { _id: req.profile._id },
      { $push: { history: history } },
      { new: true },
      (err, data) => {
        if (err) {
          return res.status(400).json({
            error: "Error updating user purchase history",
          });
        }

        next();
      }
    );
  } catch (error) {
    console.log(error);
  }
};

exports.purchaseHistory = (req, res) => {
  Order.find({ user: req.profile._id })
    .populate("user", "_id name")
    .sort("-created")
    .exec((err, orders) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }

      res.json(orders);
    });
};
