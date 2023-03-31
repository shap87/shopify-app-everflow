// @ts-check
import * as dotenv from 'dotenv'
dotenv.config()
import { Shopify } from '@shopify/shopify-api'
import { ADD_CUSTOMER_TAGS_MUTATION } from '../qraphql/mutations/index.js'
import { ORDERS_GET_QUERY } from '../qraphql/queries/index.js'

export async function addCustomerTags(session, customerId, tags) {
  console.log('Customer id:', customerId)
  console.log('Customer tag:', tags)
  console.log('session:', session)
  
  if(!tags || !customerId || !session) throw new Error(`Error\n check (session, customerId, tags) in addCustomerTags() method`);

  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);

  try {
    return await client.query({
      data: {
        query: ADD_CUSTOMER_TAGS_MUTATION,
        variables: {
          id: customerId,
          tags: tags,
        },
      },
    });
  } catch (error) {
    console.log(error)
    if (error instanceof Shopify.Errors.GraphqlQueryError) {
      throw new Error(`${error.message}\n${JSON.stringify(error.response, null, 2)}`);
    } else {
      throw error;
    }
  }
}

export async function customerByEmail(session, customerEmail) {
  if(!customerEmail || !session) throw new Error(`Error\n check (session, customerEmail) in customerByEmail() method`);

  const client = new Shopify.Clients.Rest(session.shop, session.accessToken)

  let {body} = await client.get({ 
    path: '/customers/search', 
    query: { email: customerEmail }
  })

  return body
}

export async function ordersByQuery(session, query, first = 1) {
  if(!query || !session) throw new Error(`Error\n check (session, tag) in customerByEmail() method`);

  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);

  try {
    const ordersReponse = await client.query({
      data: {
        query: ORDERS_GET_QUERY,
        variables: {
          first,
          query,
        },
      },
    });
    
    const data = ordersReponse.body.data.orders;
    let orders = data.edges.map(item => item.node);

    let hasNextPage = data.pageInfo.hasNextPage;
    let cursor = data.pageInfo.endCursor;

    while(hasNextPage) {
      const ordersReponse = await client.query({
        data: {
          query: ORDERS_GET_QUERY,
          variables: {
            first,
            query,
            after: cursor,
          },
        },
      });

      const data = ordersReponse.body.data.orders;

      orders = [...orders, ...data.edges.map(item => item.node)];

      hasNextPage = data.pageInfo.hasNextPage;
      cursor = data.pageInfo.endCursor;
    }

    orders = orders.map(order => {
      const lineItems = order.lineItems;
      delete order.lineItems;

      return ({
        ...order,
        products: lineItems.edges.map(item => item.node.product.id.split('/').pop())
      })
    });

    return orders
  } catch (error) {
    console.log(error)
    return error
  }
}

export function checkIfProductsInOrder(orders) {
  if(!orders) throw new Error(`Error\n check (orders) in checkIfProductsInOrder() method`);
  let valid = true;

  try {
    const productIds = orders.map(order => order.products).flat(2);
    const discountProductsArray = process.env.SAMPLE_PRODUCTS? process.env.SAMPLE_PRODUCTS.split(',') : [7415645274157, 7391379488813];
    const contains = discountProductsArray.some(id => productIds.includes(id.toString()));

    console.log('checkIfProductsInOrder() productIds', productIds)
    console.log('checkIfProductsInOrder() discountProductsArray', discountProductsArray)
    console.log('checkIfProductsInOrder() contains', contains)

    if(contains){
      valid = false
    }
  } catch (error) {
    console.log('checkIfProductsInOrder() error', error)
  }

  return valid
}

export async function hubspotSearch(prop = 'email', propValue) {
  if(!prop || !propValue) throw new Error(`Error\n check (property, value) in hubspotSearch() method`);

  try {
    const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        "filterGroups":[
          {
            "filters":[
              {
                "propertyName": prop,
                "operator": "EQ",
                "value": propValue
              }
            ]
          }
        ],
        "properties": ["email", "everflow_code", "order_discount_code"]
      })
    })
    const data = await response.json()
    console.log('hubspotSearch() resp', data)

    return data
  } catch (error) {
    console.log('hubspotSearch() ', error)
    return error
  }
}

export async function hubspotUpdateCustomer(id, property, value) {
  if(!id || !property || !value) throw new Error(`Error\n check (id, property, value) in hubspotUpdateCustomer() method`);
  console.log(id, property, value)
  try {
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        "properties": {
          [property]: value
        }
      })
    })
    const data = await response.json()
    console.log('hubspotUpdateCustomer() resp', data)

    return data
  } catch (error) {
    console.log('hubspotUpdateCustomer() ', error)
    return error
  }
}