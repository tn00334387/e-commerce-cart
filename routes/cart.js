const express = require('express');
const router = express.Router();
const CartModule = require('../modules/cart');

// 定义路由
router.get('/cart/:userId', CartModule.GetCart);
router.post('/cart', CartModule.AddToCart);
router.put('/cart', CartModule.UpdateCartItem);
router.delete('/cart', CartModule.RemoveFromCart);
router.delete('/cart/clear/:userId', CartModule.ClearCart);

module.exports = router;
