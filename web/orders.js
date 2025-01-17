// @ts-check
import * as dotenv from 'dotenv'
dotenv.config()
import { Shopify } from "@shopify/shopify-api";
import { addCustomerTags, hubspotSearch, hubspotUpdateCustomer, hubspotUpdateCustomerDeal, ordersByQuery } from './helpers/customer.js'
import { getEverflowDiscount } from './helpers/everflow.js';
import { DataType } from '@shopify/shopify-api';

export const Orders = {
  getEverflowDiscounts: async function(arrayOfDiscounts = []) {
    if(arrayOfDiscounts.length <= 0) return false;

    try {
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
    } catch (error) {
      console.log("getEverflowDiscounts() ", error)
      return false;
    }
  },

  getOrderFields: async function(session, orderId, fields = 'id') {
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
    console.log('getOrderFields() orderId', orderId)

    try {
      if (session && orderId) {
        let { body } = await client.get({ 
          path: `orders/${orderId}`, 
          data: JSON.stringify({
            order: {
              id: orderId,
              fields
            } 
          }), type: DataType.JSON
        });
        
        return body;
      }
      return false
    } catch (e) {
      console.log(`Failed to get order: ${orderId}: ${e.message}`);
      return false
    }
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

  checkForDiscountedProducts: function (payload) {
    const productIds = payload.line_items.map(p => p.product_id.toString());
    const discountProductsArray = process.env.SAMPLE_PRODUCTS? process.env.SAMPLE_PRODUCTS.split(',') : [7415645274157, 7391379488813];
    const contains = discountProductsArray.some(id => productIds.includes(id.toString()));

    console.log('orderTag() productIds', productIds);
    console.log('orderTag() discountProductsArray', discountProductsArray);
    console.log('orderTag() contains', contains);

    return contains;
  },

  updateOrderTags: async function (session, orderId, tags) {
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
    console.log('updateOrderTags() tags: ', tags)

    await client.put({ 
      path: `orders/${orderId}`, 
      data: JSON.stringify({
        order: {
          id: orderId,
          tags,
        }
      }), type: DataType.JSON
    })
  },

  orderTag: async function (session, payload) {
    // console.log('orderTag() session', session);
    console.log('orderTag() payload', payload);

    try {
      const orderId = payload.id;
      const orderTags = payload.tags;

      console.log('orderTag() orderId', orderId);
      console.log('orderTag() orderTags', orderTags);

      if(this.checkForDiscountedProducts(payload)) { 
        const tag = [payload.shipping_address?.address1, payload.shipping_address?.zip].join('').replace(/\s/g, '').slice(0, 40);
        const tags = `${orderTags}, ${tag}`;

        await this.updateOrderTags(session, orderId, tags);

        return true
      }

      return false
    } catch (error) {
      console.log('orderTag() error: ', error)
      return false
    }
  },

  updateHubspotCustomer: async function (payload, discountCodes, property, codeToDelete) {
    if(!payload.customer?.email) return false

    console.log('updateHubspotCustomer() email: ', payload.customer.email);

    try {
      // Searching for customer in HubSpot
      const searchResults = await hubspotSearch('email', payload.customer.email);

      console.log('updateHubspotCustomer() searchResults: ', searchResults);

      if(searchResults && searchResults.results && searchResults.results.length > 0){
        const results = searchResults.results;

        if(results && results.length > 0){
          const id = results[0].id;
          const hubDiscounts = results[0]?.properties?.order_discount_code || '';
          // const hubEverflowCode = results[0]?.properties?.everflow_code;
          console.log('updateHubspotCustomer() id, hubDiscounts: ', id, hubDiscounts);

          if(id) {
            if(property === 'everflow_code') {
              console.log('property === everflow_code');
              // Update HubSpot customer everflow_code property
              await hubspotUpdateCustomer(id, property, discountCodes);

            } else if (property === 'order_discount_code'){
              console.log('property === order_discount_code');

              // Get all discount codes from order
              let orderDiscounts = discountCodes.map(d => d.code? d.code : d.title? d.title : `${d?.value}:${d?.value_type}`).filter(d => d);

              // If used everflow discount delete it from other disocunts array
              if(codeToDelete) {
                console.log('codeToDelete', codeToDelete, orderDiscounts);
                let index = orderDiscounts && orderDiscounts.indexOf(codeToDelete);
                
                if(index >= 0){
                  delete orderDiscounts[index];
                  orderDiscounts = orderDiscounts.filter(el => el);
                }
                console.log('orderDiscounts after delete', orderDiscounts);
              }

              // Merge everflow discounts with other disocunts
              const mergedDiscounts = [...new Set([...orderDiscounts, ...hubDiscounts.split(',')])].join(',');

              await hubspotUpdateCustomer(id, property, mergedDiscounts);

              //Update last customer deal when "Total discount on product" discount applyed
              if(orderDiscounts.indexOf("Total discount on product") >= 0){
                console.log("hubspotUpdateCustomerDeal()")
                await hubspotUpdateCustomerDeal(id)
              }
            }
            return true
          }
        }
      }
      return false
    } catch (error) {
      console.log('updateHubspotCustomer(): ', error)
      return false
    }
  },

  fulfilled: async function (shopDomain, _body) {
    // @ts-ignore
    const shopSessions = await Shopify.Context.SESSION_STORAGE.findSessionsByShop(shopDomain);
    let shopSession = null;

    if (shopSessions.length > 0) {
      for (const session of shopSessions) {
        if (session.accessToken) shopSession = session;
      }
    }

    // console.log('fulfilled() shopDomain', shopDomain)
    console.log('fulfilled() shopSession', shopSession)
    // try {
      const payload = JSON.parse(_body);
      console.log('fulfilled() payload customer', payload);
      
      // discount applyed for order
      if(shopSession && payload) {
        this.orderTag(shopSession, payload)
      }
      
      if(shopSession && payload && payload.discount_applications && payload.discount_applications.length > 0){
        let everflowDisCode = null;
        console.log('payload.discount_applications', payload.discount_applications)

        if(payload.customer) { // && !payload.customer.tags.split(',').map(tag => tag.trim()).includes('everflow_linked')){
          // const discounts = [...payload.discount_applications, { title: '5CZMC1Q' }, { title: '' }]; // static discounts for testing
          const discounts = payload.discount_applications;
          console.log('Order applyed discounts', discounts);

          const everflowDiscount = await this.getEverflowDiscounts(discounts
            .map(d => 
              d && d?.code? d.code : d?.title
            )
            .filter(d => d && !/\s/g.test(d))
          )

          console.log('Everflow matched discount', everflowDiscount)

          // order discount matched with everflow discount
          if(everflowDiscount){
            everflowDisCode = everflowDiscount[0]?.[0]?.coupon_code;

            if(!payload.customer.tags.split(',').map(tag => tag.trim()).includes('everflow_linked')) {
              const customerId = `gid://shopify/Customer/${payload.customer.id}`;
  
              // add customer tag
              const response = await this.addTagToCustomer(shopSession, customerId, 'everflow_linked');
              // console.log('Add customer tag response body', response?.body)
  
              if(!response || response.message){ // error
                throw new Error(`${response.message}`);
              }
            }

            everflowDisCode && await this.updateHubspotCustomer(payload, everflowDisCode, 'everflow_code');
          }
        }
        console.log('await this.updateHubspotCustomer (other discounts)');

        await this.updateHubspotCustomer(payload, payload.discount_applications, 'order_discount_code', everflowDisCode);
        
        return true
      }
      return false
    // } catch (error) {
    //   console.log('err', error)
    //   return false
    // }
  },

  cancelOrder: async function (session, orderId, tags) {
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
    console.log('cancelOrder() orderId', orderId)

    try {
      if (session && orderId) {
        await client.post({ 
          path: `orders/${orderId}/cancel`, 
          data: JSON.stringify({
            order: {
              id: orderId,
            }
          }), type: DataType.JSON
        });
        
        const orderTags = `${tags}, CANCELATION_REASON: discount used`;
        await this.updateOrderTags(session, orderId, orderTags);

        return true
      }
      return false
    } catch (e) {
      console.log(`Failed to cancel order: ${orderId}: ${e.message}`);
      return false
    }
  },

  create: async function (shopDomain, _body) {
    // @ts-ignore
    const shopSessions = await Shopify.Context.SESSION_STORAGE.findSessionsByShop(shopDomain);
    let shopSession = null;

    if (shopSessions.length > 0) {
      for (const session of shopSessions) {
        if (session.accessToken) shopSession = session;
      }
    }

    console.log('create() shopDomain', shopDomain)
    console.log('create() shopSession', shopSession)

    try {
      const payload = JSON.parse(_body);
      console.log('orders.create() payload', payload);

      if(shopSession && payload && payload.shipping_address) {
        if(this.checkForDiscountedProducts(payload)) {
          const shipping_address = payload.shipping_address;
          const tag = [shipping_address?.address1, shipping_address?.zip].join('').replace(/\s/g, '').slice(0, 40);
          const orders = await ordersByQuery(shopSession, 'tag:' + tag);

          console.log('create() tag', tag);
          console.log('orders.length', orders.length);

          if (orders && orders.length && orders.length > 0) {
            await this.cancelOrder(shopSession, payload.id, payload.tags);
            return true
          }
        }
      }

      if(shopSession && payload && payload.note_attributes) {
        const note_attributes = payload?.note_attributes;
        console.log('note_attributes', note_attributes);

        const utm_campaign = note_attributes && note_attributes.filter(v => v.name === 'utm_campaign')[0];
        
        if(utm_campaign){
          console.log('utm_campaign', utm_campaign);
          const orderId = payload.id;
          const orderTags = payload.tags;

          // @ts-ignore
          let { order } = await this.getOrderFields(shopSession, orderId, 'tags');

          if(order) {
            const tags = order && order.tags ? `${order.tags}, ${utm_campaign.value}` : `${utm_campaign.value}`;
            console.log('tags', tags);
            await this.updateOrderTags(shopSession, orderId, tags);
            
            return true
          }
          return false
        }
      }

      return false
    } catch (error) {
      console.log('orders.create() error: ', error)
      return false
    }
  }
};
