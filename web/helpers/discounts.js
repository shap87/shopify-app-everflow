import { Shopify } from '@shopify/shopify-api'
import { CUSTOMER_SEGMENT_CREATE_MUTATION } from '../qraphql/mutations/index.js'
import { CUSTOMER_SEGMENT_GET_QUERY } from '../qraphql/queries/index.js'
import { DataType } from '@shopify/shopify-api'

export async function createDiscountCodeJob(session, priceRuleId, codes) {
  if(!session || !codes) return null
 
  try {
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken)
    const data = await client.post({ 
      path: `price_rules/${priceRuleId}/batch`, 
      data: JSON.stringify({
        discount_codes: codes
      }), type: DataType.JSON
    })
    // console.log('creating job data', data)
    return data
  } catch (error) {
    console.log(error)
  }
}

// export async function createPriceRule(session) {
//   if(!session) return null

//   try {
//     const client = new Shopify.Clients.Rest(session.shop, session.accessToken)
//     const data = await client.post({ path: 'price_rules', data: JSON.stringify({
//       price_rule: {
//         title: "TEST",
//         target_type: "line_item",
//         target_selection: "all",
//         allocation_method: "across",
//         value_type: "percentage",
//         value: "-10.0",
//         once_per_customer: true,
//         customer_selection: "prerequisite",
//         customer_segment_prerequisite_ids: [498139660578],
//         starts_at: "2022-12-24T17:59:10Z"
//       }
//     }), type: DataType.JSON })
//     return data
//   } catch (error) {
//     console.log(error)
//     // if (error instanceof Shopify.Errors.GraphqlQueryError) {
//     //   throw new Error(`${error.message}\n${JSON.stringify(error.response, null, 2)}`);
//     // } else {
//     //   throw error;
//     // }
//   }
// }

export async function getPriceRule(session, id) {
  if(!session || !id) return null

  try {
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken)
    const { body } = await client.get({ path: `price_rules/${id}`})

    return body
  } catch (error) {
    console.log(error)
    // if (error instanceof Shopify.Errors.GraphqlQueryError) {
    //   throw new Error(`${error.message}\n${JSON.stringify(error.response, null, 2)}`);
    // } else {
    //   throw error;
    // }
  }
}

export async function getCountOfDiscountCodes(session, priceRuleId) {
  if(!session || !priceRuleId) return null

  try {
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken)
    const { body } = await client.get({ path: `price_rules/${priceRuleId}/discounts/count` })

    console.log('body', body)

    return body
  } catch (error) {
    console.log(error)
  }
}

export async function getListOfDiscountCodes(session, priceRuleId) {
  if(!session || !priceRuleId) return null

  try {
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken)
    const response = await client.get({ 
      path: `price_rules/${priceRuleId}/discount_codes`,
      query: {
        limit: 250,
      }
    })

    let page = 1;
    let hasNextPage = response?.pageInfo?.nextPage?.query?.page_info
    let discounts = response?.body?.discount_codes || [];
  
    while (hasNextPage) { //&& page <= 2
      try {
        const response = await client.get({ 
          path: `price_rules/${priceRuleId}/discount_codes`, 
          query: {
            limit: 250,
            page_info: hasNextPage
          }
        })

        discounts = discounts.concat(response?.body?.discount_codes);
  
        const linkHeader = response.headers.get('link');
        if (linkHeader) {
          const links = linkHeader.split(',');
          if(links.some((link) => link.includes('rel="next"'))){
            hasNextPage = response?.pageInfo?.nextPage?.query?.page_info
          } else {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
  
        page++;
      } catch (error) {
        console.error(error);
        hasNextPage = false;
      }
    }
    // console.log('discounts', discounts)
    return discounts;
  } catch (error) {
    console.log(error)
    return null
  }
}

export async function getCustomerSegment(session, id) {
  if(!id || !session) return null

  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);

  try {
    const data = await client.query({
      data: {
        query: CUSTOMER_SEGMENT_GET_QUERY,
        variables: {
          id,
        },
      },
    });
    // console.log("getCustomerSegment BODY", data.body)
    return data.body
  } catch (error) {
    if (error instanceof Shopify.Errors.GraphqlQueryError) {
      throw new Error(`${error.message}\n${JSON.stringify(error.response, null, 2)}`);
    } else {
      throw error;
    }
  }
}

export async function createCustomerSegment(session, name, query) {
  if(!name || !query || !session) return null

  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);

  try {
    const data = await client.query({
      data: {
        query: CUSTOMER_SEGMENT_CREATE_MUTATION,
        variables: {
          name,
          query,
        },
      },
    });
    // console.log("DATA BODY", data.body)
    return data.body
  } catch (error) {
    if (error instanceof Shopify.Errors.GraphqlQueryError) {
      throw new Error(`${error.message}\n${JSON.stringify(error.response, null, 2)}`);
    } else {
      throw error;
    }
  }
}

