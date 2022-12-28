import { Shopify } from '@shopify/shopify-api'
import { ADD_CUSTOMER_TAGS_MUTATION } from '../qraphql/mutations/index.js'

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
