import { Shopify } from "@shopify/shopify-api";
import { addCustomerTags } from '../helpers/customer.js'
import getEverflowDiscount from '../helpers/everflow.js';

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
      console.log(`Tag ${tag} added for customer ${customerId}`, response?.body)
      return response
    } catch (e) {
      console.log(`Failed to add customer tag: ${e.message}`);
      return e
    }
  },

  fulfilled: async function (shopDomain, _body) {
    const shopSessions = await Shopify.Context.SESSION_STORAGE.findSessionsByShop(shopDomain);
    let shopSession = null;

    if (shopSessions.length > 0) {
      for (const session of shopSessions) {
        if (session.isActive() && session.accessToken) shopSession = session;
        //  Session {
        //  id: 'offline_dermeleve-test.myshopify.com',
        //  shop: 'dermeleve-test.myshopify.com',
        //  state: 'offline_715026707320930',
        //  isOnline: false,
        //  scope: 'read_fulfillments,write_products,write_customers,write_discounts,write_price_rules,read_product_listings,write_orders,write_draft_orders',
        //  accessToken: 'shpua_90c61d1b638d2ace36cd97e7efd7263a'
        //  }
      }
    }

    try {
      const payload = JSON.parse(_body);
      // discount applyed for order
      if(payload && payload.discount_applications && payload.discount_applications.length > 0){
        if(payload.customer && !payload.customer.tags.split(',').map(tag => tag.trim()).includes('everflow_linked')){
          // const discounts = [...payload.discount_applications, { title: '5CZMC1Q' }, { title: '' }]; // static discounts for testing

          const discounts = payload.discount_applications;
          console.log('Order applyed discounts', discounts);

          const everflowDiscount = await this.getEverflowDiscounts(discounts.filter(d => d).map(d => d.title))
          console.log('Everflow mathced discount', everflowDiscount)

          // order discount matched with everflow discount
          if(everflowDiscount){
            const customerId = `gid://shopify/Customer/${payload.customer.id}`

            // add customer tag
            const response = await this.addTagToCustomer(shopSession, customerId, 'everflow_linked')

            console.log('Add customer tag response body', response?.body)

            if(!response || response.message){ // error
              return false
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
