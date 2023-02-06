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

// query fetchLineItems($orderId: ID!, $afterCursor: String) {
//   node(id: $orderId) {
//     ... on Order {
//       lineItems(first: 10, after: $afterCursor) {
//         edges {
//           node {
//             title
//             variant {
//               title
//               sku
//               price
//             }
//           }
//           cursor
//         }
//         pageInfo {
//           hasNextPage
//         }
//       }
//     }
//   }
// }

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

    if(contains){
      valid = false
    }
  } catch (error) {
    console.log(error)
  }

  return valid
}
