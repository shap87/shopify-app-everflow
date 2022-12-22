import { Shopify } from '@shopify/shopify-api'

const ADD_CUSTOMER_TAGS_MUTATION = `
  mutation tagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`

export async function addCustomerTags(session, customerId, tags) {
  console.log('Customer id:', customerId)
  console.log('Customer tag:', tags)
  
  if(!tags || !session) return null

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
    if (error instanceof Shopify.Errors.GraphqlQueryError) {
      throw new Error(`${error.message}\n${JSON.stringify(error.response, null, 2)}`);
    } else {
      throw error;
    }
  }
}
