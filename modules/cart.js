const Cart = require('../models/cart')
const Axios = require('axios');
const mongoose = require('mongoose')
const RedisClient = require('../libs/redis');  // 再次引入封装的 Redis 类
const redis = new RedisClient();

const CartModule = {

    GetCart: async (req, res) => {

        // const { userId } = req.params
        // const userId = req.user?.userId
        const userId = req.headers['x-user-id'];

        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
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
    
            res.status(200).json(cart);
        } catch (error) {
            console.log(`Cart - GetCart : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'GetCart failed' 
            });
        }

    },

    GetCartR: async (req, res) => {

        const userId = req.headers['x-user-id'];

        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
                return 
            }

            const cacheKey = `cart:${userId}`;
            // from redis get cart data
            const cartData = await redis.get(cacheKey);
            if (cartData) {
                console.log(`user-${userId} get cart data from redis`)
                return res.status(200).json(JSON.parse(cartData));  // return cart data from redis
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

            // store cart data to redis
            await redis.set(cacheKey, JSON.stringify(cart), 3600); 
            console.log(`user-${userId} get cart data from db and store to redis`)
            res.status(200).json(cart);
            
        } catch (error) {
            console.log(`Cart - GetCartR : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'GetCartR failed' 
            });
        }

    },

    AddToCart: async (req, res) => {

        const userId = req.headers['x-user-id'];
        const { productId, quantity } = req.body;

        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
                return 
            }

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                console.log(`AddToCart : Invalid product ID `)
                res.status(422).send({ 
                    status: `Unprocessable_Entity`,
                    message: 'Invalid product ID' 
                });
                return 
            }

            const { data: productInfo } = await Axios.get(`${process.env.PRODUCT_HOST_URI}/api/product/products/${productId}`);
            const { price = 0 } = productInfo
            let cart = await Cart.findOne({ userId });

            // 如果购物车不存在，则创建一个新的购物车
            if (!cart) {
                cart = new Cart({ 
                    userId, 
                    items: [{ 
                        productId, 
                        productPrice: price,
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
                    cart.items.push({ productId, productPrice: price, quantity });
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

    AddToCartR: async (req, res) => {

        const userId = req.headers['x-user-id'];
        const { productId, quantity } = req.body;

        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
                return 
            }

            const productCacheKey = `product:${productId}`;
            let productData = await redis.get(productCacheKey);

            
            if (productData){
                console.log(`product-${productId} data get from redis`)
                productData = JSON.parse(productData);
            } else {
                if (!mongoose.Types.ObjectId.isValid(productId)) {
                    console.log(`AddToCart : Invalid product ID `)
                    res.status(422).send({ 
                        status: `Unprocessable_Entity`,
                        message: 'Invalid product ID' 
                    });
                    return 
                }
                const { data } = await Axios.get(`${process.env.PRODUCT_HOST_URI}/api/product/products/${productId}`);
                await redis.set(productCacheKey, JSON.stringify(data), 3600);
                console.log(`product-${productId} data get from db and store to redis`)
                productData = data;
            }
        
            const { price = 0 } = productData

            const cartCacheKey = `cart:${userId}`;
            let cart = await redis.get(cartCacheKey);
            if(cart){
                cart = JSON.parse(cart);
                console.log(`user-${userId} get cart data from redis`)
            } else {
                cart = await Cart.findOne({ userId });
                console.log(`user-${userId} get cart data from db`)
            }

            if (!cart) {    // if cart is not exist, create a new cart
                cart = new Cart({ 
                    userId, 
                    items: [{ 
                        productId, 
                        productPrice: price,
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
                    cart.items.push({ productId, productPrice: price, quantity });
                }
            }

            if (!(cart instanceof Cart)) {  // convert to mongoose Cart instance
                cart = new Cart(cart);
                cart.isNew = false;  // label this is an existing record, not a new record
            }
            await cart.save();
            await redis.set(cartCacheKey, JSON.stringify(cart), 3600); 

            console.log(`user ${userId} add product-${productId} succeed and update to redis`)

            res.json(cart);

        } catch (error) {
            console.log(`Cart - AddToCartR : `, error)
            res.status(500).json({ 
                status: "Failed",
                message: 'AddToCartR failed' 
            });
        }
    },

    UpdateCartItem: async (req, res) => {
        // const userId = req.user?.userId
        const userId = req.headers['x-user-id'];
        const { productId, quantity } = req.body;
        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
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

    UpdateCartItemR: async (req, res) => {

        const userId = req.headers['x-user-id'];
        const { productId, quantity } = req.body;

        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
                return 
            }

            const cacheKey = `cart:${userId}`;
            let cart = await redis.get(cacheKey);
            if(cart){
                cart = JSON.parse(cart);
                console.log(`user-${userId} get cart data from redis`)
            }else{  
                cart = await Cart.findOne({ userId });
                console.log(`user-${userId} get cart data from db`)
            }

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
                if (!(cart instanceof Cart)) {  // convert to mongoose Cart instance
                    cart = new Cart(cart);
                    cart.isNew = false;  // label this is an existing record, not a new record
                }
                await cart.save();
                await redis.set(cacheKey, JSON.stringify(cart), 3600);
                console.log(`user-${userId} update product-${productId} in cart succeed and update to redis`)
                res.json(cart);
            } else {
                console.log(`User - ${userId} product-${productId} is not exist in cart`)
                res.status(404).json({ 
                    status: `NOT_FOUND`,
                    message: 'Product not found in cart' 
                });
            }
        } catch (error) {
            console.log(`Cart - UpdateCartItemR : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'UpdateCartItemR failed' 
            });
        }
    },

    RemoveFromCart: async (req, res) => {

        // const userId = req.user?.userId
        const userId = req.headers['x-user-id'];
        const { productId } = req.body;
        
        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
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

    RemoveFromCartR: async (req, res) => { 

        const userId = req.headers['x-user-id'];
        const { productId } = req.body;
        
        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
                return 
            }

            const cacheKey = `cart:${userId}`;
            let cart = await redis.get(cacheKey);

            if(cart){
                cart = JSON.parse(cart);
                console.log(`user-${userId} get cart data from redis`)
            }else{
                cart = await Cart.findOne({ userId });
                console.log(`user-${userId} get cart data from db`)
            }

            if (!cart) {
                console.log(`User - ${userId} cart is unexist`)
                res.status(404).json({ 
                    status: `NOT_FOUND`,
                    message: 'Cart not found' 
                })
                return 
            }

            cart.items = cart.items.filter(item => item.productId.toString() !== productId);
            if (!(cart instanceof Cart)) {  // convert to mongoose Cart instance
                cart = new Cart(cart);
                cart.isNew = false;  // label this is an existing record, not a new record
            }
            await cart.save();
            await redis.set(cacheKey, JSON.stringify(cart), 3600);

            console.log(`user-${userId} remove product-${productId} in cart succeed and update to redis`)

            res.json(cart);
        } catch (error) {
            console.log(`Cart - RemoveFromCartR : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'RemoveFromCartR failed' 
            });
        }
    },

    ClearCart: async (req, res) => {

        // const userId = req.user?.userId
        const userId = req.headers['x-user-id'];
        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
                return 
            }

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

    ClearCartR: async (req, res) => {

        const userId = req.headers['x-user-id'];

        try {

            if( !userId ){
                console.log(`User is not login`)
                res.status(401).json({ 
                    status: 'Unauthorized',
                    message: 'User is not login' 
                })
                return 
            }

            const cacheKey = `cart:${userId}`;
    
            // clear cart data in redis
            await Cart.findOneAndDelete({ userId });
            await redis.del(cacheKey);

            console.log(`user-${userId} cart clear succeed and clear in redis`)
            res.json({ message: 'Cart cleared' });  
        } catch (error) {
            console.log(`Cart - ClearCartR : `, error)
            res.status(500).json({ 
                status: `Failed`,
                message: 'ClearCart failed' 
            });
        }
    },

}

module.exports = CartModule;