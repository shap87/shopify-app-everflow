export const ADD_CUSTOMER_TAGS_MUTATION = `
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


// mutation {
//   segmentCreate(name: "Email Subscribers", query: "email_subscription_status = 'SUBSCRIBED'") {
//     segment {
//       id
//       name
//       query
//     }
//     userErrors {
//       message
//       field
//     }
//   }
// }
export const CUSTOMER_SEGMENT_CREATE_MUTATION = `
  mutation segmentCreate($name: String!, $query: String!) {
    segmentCreate(name: $name, query: $query) {
      segment {
        id
        name
        query
      }
      userErrors {
        field
        message
      }
    }
  }
`
