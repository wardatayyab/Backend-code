const express = require('express');
const app = express();
const Thing = require('./Thing'); // Mongoose model for products
const connectDB = require('./config'); // Database connection
const multer = require('multer');
const cors = require('cors');
const Register = require('./Register'); 

const path = require('path');
const stripe = require('stripe')("sk_test_51QJyZAP8iOxx9lGYhCVKzcrJWPnAWlGxiZjKDQnryaLNKq2d8LA7eZuzYC65JSbnRQ5J1fzOGZmArJWKqyt5ruF900zgdWpNko");

app.use(express.json());
app.use(cors());

connectDB();

let cart = [];

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Route to create a product (admin only)
app.post('/create', upload.single('image'), async (req, res) => {
    let data = new Thing({
        title: req.body.title,
        price: req.body.price,
        description: req.body.description,
        category: req.body.category,
        image: req.file ? (`http://localhost:3200/uploads/${req.file.filename}`) : null
    });
    let result = await data.save();
    res.send(result);
});

// Route to list all products
app.get('/list', async (req, res) => {
    let data = await Thing.find();
    res.send(data);
});

// Route to get a single product by ID
app.get('/list/:id', async (req, res) => {
    let productID = req.params.id;
    let product = await Thing.findById(productID);
    res.send(product);
});

// User registration
app.post("/register", async (req, res) => {
    let data = new Register(req.body);
    let result = await data.save();
    result = result.toObject();
    delete result.password;
    res.send(result);
});

app.post("/login", async (req, resp) => {
    if (req.body.email && req.body.password) {
        let user = await Register.findOne(req.body).select("-password");
        if (user) {
            resp.send(user);
        } else {
            resp.send("No User Found");
        }
    } else {
        resp.send("No User Found");
    }
});

app.get('/category/:category', async (req, resp) => {
    const category = req.params.category;
    let data = await Thing.find({ category: category });
    resp.send(data);
});
// Route to delete a product by ID
app.delete('/delete/:id', async (req, res) => {
    let data = await Thing.findByIdAndDelete(req.params.id);
    res.send({ message: 'Product deleted', data });
});

// Route to update a product by ID
app.put('/update/:id', async (req, res) => {
    let data = await Thing.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.send({ message: 'Product updated', data });
});

// Route to search products by keyword
app.get('/search/:keyword', async (req, res) => {
    const keyword = req.params.keyword;
    try {
        let data = await Thing.find({
            $or: [
                { title: { $regex: keyword, $options: "i" } },
                { price: { $regex: keyword, $options: "i" } },
                { category: { $regex: keyword, $options: "i" } }
            ]
        });
        res.send(data);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching products', error: error.message });
    }
});

// Add product to cart
app.post('/cart/:id', async (req, res) => {
    const productId = req.params.id;
    const product = await Thing.findById(productId);

    if (product) {
        const existingProductIndex = cart.findIndex(item => item._id.toString() === productId);

        if (existingProductIndex !== -1) {
            cart[existingProductIndex].quantity += 1;
        } else {
            product.quantity = 1;
            cart.push(product);
        }

        res.send({ message: 'Product added to cart', cart });
    } else {
        res.status(404).send({ message: 'Product not found' });
    }
});

// Get cart contents
app.get('/cart', (req, res) => {
    res.send(cart);
});

// Update the quantity of a cart item
app.put('/cart/:id', (req, res) => {
    const itemId = req.params.id;
    const { quantity } = req.body;

    const itemIndex = cart.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
        return res.status(404).send({ message: 'Item not found in cart' });
    }

    if (quantity < 1) {
        return res.status(400).send({ message: 'Quantity must be at least 1' });
    }

    cart[itemIndex].quantity = quantity;

    res.send({ message: 'Cart item updated', cart });
});

// Remove an item from the cart
app.delete('/cart/:id', (req, res) => {
    const itemId = req.params.id;

    const itemIndex = cart.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
        return res.status(404).send({ message: 'Item not found in cart' });
    }

    cart.splice(itemIndex, 1);

    res.send({ message: 'Item removed from cart', cart });
});

// Create a Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).send('No items provided');
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items.map(item => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.title,
                    },
                    unit_amount: Math.round(parseFloat(item.price) * 100),
                },
                quantity: item.quantity || 1,
            })),
            mode: 'payment',
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel',
        });

        res.json({ id: session.id });
    } catch (error) {
        res.status(500).send({ message: 'Error creating Stripe session', error: error.message });
    }
});
app.put("/soldout/:id", async (req, resp) => {
    try {
       const productId = req.params.id;
       const updatedProduct = await Thing.findByIdAndUpdate(
          productId,
          { $set: { status: "sold out" } },
          { new: true }
       );
 
       if (updatedProduct) {
          resp.send({ message: "Product marked as sold out", product: updatedProduct });
       } else {
          resp.status(404).send({ message: "Product not found" });
       }
    } catch (error) {
       console.error("Error marking product as sold out:", error);
       resp.status(500).send({ message: "An error occurred", error });
    }
 });

app.listen(3200, () => {
    console.log('Server is running on http://localhost:3200');
});