const Cart = require('../models/cart')
const mongoose = require('mongoose')

const CartModule = {

    GetCart: async (req, res) => {

        const { userId } = req.params

        try {

            const cart = await Cart.findOne({ userId });
            if (!cart) {
                console.log(`User - ${userId} cart is unexist`)
                res.status(404).json({ 
                    status: `NOT_FOUND`,
                    message: 'Cart not found' 
                })
                return 
            }
    
            res.status(200).json(cart);
        } catch (error) {
            console.log(`Cart - GetCart : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'GetCart failed' 
            });
        }

    },

    AddToCart: async (req, res) => {

        const { userId, productId, quantity } = req.body;

        try {

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                console.log(`AddToCart : Invalid product ID `)
                res.status(422).send({ 
                    status: `Unprocessable_Entity`,
                    message: 'Invalid product ID' 
                });
                return 
            }
    
            let cart = await Cart.findOne({ userId });

            // 如果购物车不存在，则创建一个新的购物车
            if (!cart) {
                cart = new Cart({ 
                    userId, 
                    items: [{ 
                        productId, 
                        quantity 
                    }] 
                });
            } else {
                // 检查产品是否已在购物车中
                const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

                if (itemIndex > -1) {
                    // 如果产品已存在，更新数量
                    cart.items[itemIndex].quantity += quantity;
                } else {
                    // 如果产品不存在，添加到购物车
                    cart.items.push({ productId, quantity });
                }
            }

            await cart.save();

            console.log(`user ${userId} add product-${productId} succeed`)

            res.json(cart);

        } catch (error) {
            console.log(`Cart - AddToCart : `, error)
            res.status(500).json({ 
                status: "Failed",
                message: 'AddToCart failed' 
            });
        }
    },

    UpdateCartItem: async (req, res) => {
        const { userId, productId, quantity } = req.body;
        try {

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                console.log(`UpdateCartItem : Invalid product ID `)
                res.status(422).send({ 
                    status: `Unprocessable_Entity`,
                    message: 'Invalid product ID' 
                });
                return 
            }

            const cart = await Cart.findOne({ userId });
            if (!cart) {
                console.log(`UserId - ${userId} cart is unexist`)
                res.status(404).json({ 
                    status: `NOT_FOUND`,
                    message: 'Cart not found' 
                })
                return 
            }

            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity = quantity;
                await cart.save();
                res.json(cart);
            } else {
                console.log(`User - ${userId} product-${productId} is not exist in cart`)
                res.status(404).json({ 
                    status: `NOT_FOUND`,
                    message: 'Product not found in cart' 
                });
            }
        } catch (error) {
            console.log(`Cart - UpdateCartItem : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'UpdateCartItem failed' 
            });
        }
    },

    RemoveFromCart: async (req, res) => {

        const { userId, productId } = req.body;

        try {

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                console.log(`RemoveFromCart : Invalid product ID `)
                res.status(422).send({ 
                    status: `Unprocessable_Entity`,
                    message: 'Invalid product ID' 
                });
                return 
            }

            const cart = await Cart.findOne({ userId });

            if (!cart) {
                console.log(`User - ${userId} cart is unexist`)
                res.status(404).json({ 
                    status: `NOT_FOUND`,
                    message: 'Cart not found' 
                })
                return 
            }

            cart.items = cart.items.filter(item => item.productId.toString() !== productId);
            await cart.save();

            console.log(`user-${userId} remove product-${productId} succeed`)

            res.json(cart);
        } catch (error) {
            console.log(`Cart - RemoveFromCart : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'RemoveFromCart failed' 
            });
        }
    },

    ClearCart: async (req, res) => {

        const { userId } = req.params;

        try {

            const cart = await Cart.findOneAndDelete({ userId });
            if (!cart) {
                console.log(`ClearCart : user-${userId} cart is unexist`)
                res.status(404).json({ message: 'Cart not found' })
                return
            }
            console.log(`user-${userId} cart clear succeed`)
            res.json({ message: 'Cart cleared' });
        } catch (error) {
            console.log(`Cart - ClearCart : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'ClearCart failed' 
            });
        }
    },

}

module.exports = CartModule;