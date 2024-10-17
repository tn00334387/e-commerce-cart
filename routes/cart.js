const express = require('express');
const router = express.Router();
const CartModule = require('../modules/cart');

router.get('/cart', CartModule.GetCart);
router.post('/cart', CartModule.AddToCart);
router.put('/cart', CartModule.UpdateCartItem);
router.delete('/cart', CartModule.RemoveFromCart);
router.delete('/cart/clear', CartModule.ClearCart);

router.get('/cart_r', CartModule.GetCartR);
router.post('/cart_r', CartModule.AddToCartR);
router.put('/cart_r', CartModule.UpdateCartItemR);
router.delete('/cart_r', CartModule.RemoveFromCartR);
router.delete('/cart_r/clear', CartModule.ClearCartR);

module.exports = router;
