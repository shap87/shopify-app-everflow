// @ts-check
import * as dotenv from 'dotenv'
dotenv.config()
import { Shopify } from "@shopify/shopify-api";
import { addCustomerTags } from './helpers/customer.js'
import { getEverflowDiscount } from './helpers/everflow.js';
import { DataType } from '@shopify/shopify-api';

export const Orders = {
  getEverflowDiscounts: async function(arrayOfDiscounts = []) {
    if(arrayOfDiscounts.length <= 0) return false;

    let stopped = false
    let length = arrayOfDiscounts.length
    let everflowCouponCodes = []

    while(!stopped) {
      let res = await getEverflowDiscount(arrayOfDiscounts[length - 1])

      if(res && res.coupon_codes && res.coupon_codes.length > 0) {
        everflowCouponCodes.push(res.coupon_codes)
      }

      length -= 1;
      if (length <= 0) stopped = true
    }

    if(everflowCouponCodes.length > 0) return everflowCouponCodes

    return false;
  },

  addTagToCustomer: async function (session, customerId, tag = 'everflow_linked') {
    try {
      const response = await addCustomerTags(session, customerId, tag);
      // console.log('response', response)
      console.log(`Tag ${tag} added for customer ${customerId}`, response?.body)
      return response
    } catch (e) {
      console.log(`Failed to add customer tag: ${e.message}`);
      return e
    }
  },

  orderTag: async function (session, payload) {
    try {
      const productIds = payload.line_items.map(p => p.product_id.toString());
      const discountProductsArray = process.env.SAMPLE_PRODUCTS? process.env.SAMPLE_PRODUCTS.split(',') : [7415645274157, 7391379488813];
      const contains = discountProductsArray.some(id => productIds.includes(id.toString()));
      const orderId = payload.id;
      const orderTags = payload.tags;

      if(contains) {
        const tag = [payload.shipping_address?.address1, payload.shipping_address?.zip].join('').replace(/\s/g, '').slice(0, 40);
        const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
        
        await client.put({ 
          path: `orders/${orderId}`, 
          data: JSON.stringify({
            order: {
              id: orderId,
              tags: `${orderTags}, ${tag}`,
            }
          }), type: DataType.JSON
        })
      }
    } catch (error) {
      console.log(error)
    }
  },

  fulfilled: async function (shopDomain, _body) {
    // @ts-ignore
    const shopSessions = await Shopify.Context.SESSION_STORAGE.findSessionsByShop(shopDomain);
    let shopSession = null;

    if (shopSessions.length > 0) {
      for (const session of shopSessions) {
        console.log('session', session)
        if (session.accessToken) shopSession = session;
      }
    }
    // console.log('shopDomain', shopDomain)
    // console.log('shopSession', shopSession)
    try {
      const payload = JSON.parse(_body);
      
      // discount applyed for order
      if(shopSession && payload) {
        this.orderTag(shopSession, payload)
      }
      if(shopSession && payload && payload.discount_applications && payload.discount_applications.length > 0){
        if(payload.customer && !payload.customer.tags.split(',').map(tag => tag.trim()).includes('everflow_linked')){
          // const discounts = [...payload.discount_applications, { title: '5CZMC1Q' }, { title: '' }]; // static discounts for testing
          const discounts = payload.discount_applications;
          console.log('Order applyed discounts', discounts);
          console.log('payload customer', payload);

          const everflowDiscount = await this.getEverflowDiscounts(discounts.filter(d => d).map(d => d.title))
          console.log('Everflow matched discount', everflowDiscount)

          // order discount matched with everflow discount
          if(everflowDiscount){
            const customerId = `gid://shopify/Customer/${payload.customer.id}`

            // add customer tag
            const response = await this.addTagToCustomer(shopSession, customerId, 'everflow_linked')

            console.log('Add customer tag response body', response?.body)

            if(!response || response.message){ // error
              throw new Error(`${response.message}`);
            }

            return true
          }
        } else {
          return true
        }
      }
    } catch (error) {
      console.log('err', error)
      return false
    }
  }
};
