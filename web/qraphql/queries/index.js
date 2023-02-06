export const CUSTOMER_SEGMENTS_GET_QUERY = `
  segments(first: $first, query: $query) {
    edges {
      cursor
      node {
        id
        name
        query
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
`

export const CUSTOMER_SEGMENT_GET_QUERY = `
  query ($id: ID!) {
    segment(id: $id) {
      id
      name
      query
    }
  }
`

export const ORDERS_GET_QUERY = `
  query ($first: Int!, $query: String, $after: String) {
    orders(first: $first, query: $query, after: $after) {
      edges {
        cursor
        node {
          id
          tags
          
          shippingAddress {
            address1
            address2
            city
            company
            country
            firstName
            lastName
            phone
            province
            zip
          }

          lineItems(first: 250) {
            edges {
              cursor
              node {
                product {
                  id
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage, endCursor
      }
    }
  }
`
