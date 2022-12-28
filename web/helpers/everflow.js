import * as dotenv from 'dotenv'
dotenv.config()

export function divideArray(array, perChunk) {
  const result = []

  for (let i = 0; i < array.length; i += perChunk) {
    result.push(array.slice(i, i + perChunk))
  }

  return result
}

export async function getEverflowDiscounts () {
  try {
    // bug with an empty space in the coupon code
    const response = await fetch(`${process.env.EVERFLOW_API_URL}`, {
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

export async function getEverflowDiscount (couponCode) {
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
