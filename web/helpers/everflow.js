import * as dotenv from 'dotenv'
dotenv.config()

export default async function getEverflowDiscount (couponCode) {
  if(!couponCode || couponCode === '') return null
  console.log('fetch couponCode', couponCode)
  try {
    // bug with an empty space in the coupon code
    const response = await fetch(`${process.env.EVERFLOW_API_URL}?filter=coupon_code%3D${encodeURI(couponCode.replace(' ', ''))}`, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'X-Eflow-API-Key': process.env.EVERFLOW_API_KEY
      },
    });
    const data = response.json()
    return data
  } catch (error) {
    console.log(error)
    return null
  }
};

// "discount_applications": [{
//   "target_type": "line_item",
//   "type": "automatic",
//   "value": "10.0",
//   "value_type": "percentage",
//   "allocation_method": "across",
//   "target_selection": "entitled",
//   "title": "AUTODISCOUT"
// },{
//   "type": "manual",
//   "value": "5.0",
//   "value_type": "fixed_amount",
//   "allocation_method": "each",
//   "target_selection": "explicit",
//   "target_type": "line_item",
//   "description": "Discount",
//   "title": "Discount"
// }],

 // {
//   coupon_codes: [
//     {
//       network_coupon_code_id: 2699,
//       network_id: 1291,
//       network_affiliate_id: 2709,
//       network_offer_id: 1,
//       coupon_code: '5CZMC1Q',
//       coupon_status: 'active',
//       internal_notes: '',
//       time_created: 1671634824,
//       time_saved: 1671634824,
//       relationship: {},
//       start_date: '',
//       end_date: ''
//     }
//   ]
// }
