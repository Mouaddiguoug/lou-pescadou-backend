const { Order, CartItem } = require("../models/order");
const { errorHandler } = require("../helpers/dbErrorHandler");

exports.findOrderById = (req, res, next, id) => {
  Order.findById(id)
    .populate("products.product", "name price")
    .exec((err, order) => {
      if (err || !order) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }

      req.order = order;

      next();
    });
};

exports.create = async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_API_KEY);

  const order = new Order(req.body.data);
  const oreders = await order.save();
  const pricesPromises = oreders.products.map((product) => {
    return stripe.prices
      .list({
        product: product._id.toString(),
      })
      .then((price) => {
        return { price: price.data[0].id, quantity: product.quantity };
      })
      .catch((err) => console.log(err));
  });

  const prices = await Promise.all(pricesPromises);

  const session = await stripe.checkout.sessions.create({
    success_url: "https://example.com/success",
    line_items: prices,
    mode: "payment",
    customer_email: req.body.data.userEmail,
  });

  res.json(session);
};

exports.updateOrderStatus = (req, res) => {
  Order.update(
    { _id: req.body.orderId },
    { $set: { status: req.body.status } },
    (err, order) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(order);
    }
  );
};

exports.listOrders = (req, res) => {
  Order.find()
    .populate("user", "_id name address")
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

exports.getStatusValues = (req, res) => {
  res.json(Order.schema.path("status").enumValues);
};
