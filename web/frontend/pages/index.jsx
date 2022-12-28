import { useEffect, useState } from "react"
import {
  Page,
  Card,
  Button,
  TextContainer,
  TextStyle,
  SettingToggle,
  SkeletonBodyText,
  InlineError,
  Stack,
  Badge,
} from "@shopify/polaris"
import { Toast } from "@shopify/app-bridge-react"
import { useAuthenticatedFetch } from "../hooks"

export default function HomePage() {
  const fetch = useAuthenticatedFetch()

  const emptyToastProps = { content: '' }
  const [toastProps, setToastProps] = useState(emptyToastProps)

  const [isLoading, setIsLoading] = useState(false)

  const [custSegmentLoading, setCustSegmentLoading] = useState(true)
  const [segment, setSegment] = useState(false)

  const [ruleSetLoading, setRuleSetLoading] = useState(true)
  const [ruleSet, setRuleSet] = useState(false)

  const [discountsLoading, setDiscountsLoading] = useState(true)
  const [discounts, setDiscounts] = useState(false)

  const [everflowdiscountsLoading, setEverflowDiscountsLoading] = useState(true)
  const [everflowDiscounts, setEverflowDiscounts] = useState(false)

  const [mismatchedDiscounts, setMismatchedDiscounts] = useState(false)

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short'
  }

  const formatter = new Intl.DateTimeFormat('en-US', options)
  const humanReadableDate = ruleSet && formatter.format(new Date(ruleSet?.updated_at))

  useEffect(() => {
    updateDiscountInformation()
  }, [])

  const updateDiscountInformation = async () => {
    await getCustomerSegment()
    await getRuleSet()

    const everflowDisc = await getListOfEverlowDiscountCodes()
    const shopifyDisc = await getListOfDiscountCodes()

    if (
      (everflowDisc && everflowDisc.coupon_codes && everflowDisc.coupon_codes.length)
      !=
      (shopifyDisc && shopifyDisc?.length)
    ) {
      checkForMismatchedCodes(everflowDisc.coupon_codes, shopifyDisc)
    }
  }

  const checkForMismatchedCodes = async (everflowDisc, shopifyDisc) => {
    if (everflowDisc && shopifyDisc) {
      const mismatched = everflowDisc.filter((item) => !shopifyDisc.some((disc) => disc.code === item.coupon_code))
      if (mismatched.length > 0) {
        setMismatchedDiscounts(mismatched)
      }
    }
  }

  const getListOfEverlowDiscountCodes = async () => {
    setEverflowDiscountsLoading(true)

    try {
      const response = await fetch("/api/discounts/everflowlist")
      let { data } = await response.json()
      // console.log('getListOfEverlowDiscountCodes', data)

      setEverflowDiscountsLoading(false)
      data && data.coupon_codes && setEverflowDiscounts(data.coupon_codes)

      return data
    } catch (error) {
      console.log(error)
      setToastProps({
        content: "There was an error getting everflow discounts",
        error: true,
      })
      setEverflowDiscountsLoading(false)
      setEverflowDiscounts(false)
    }
  }

  const getListOfDiscountCodes = async () => {
    setDiscountsLoading(true)

    try {
      const response = await fetch("/api/discounts/list")
      let { data } = await response.json()
      console.log('getListOfDiscountCodes', data.length)

      setDiscountsLoading(false)
      data && setDiscounts(data)

      return data
    } catch (error) {
      console.log(error)
      setToastProps({
        content: "There was an error getting discounts",
        error: true,
      })
      setDiscountsLoading(false)
      setDiscounts(false)
    }
  }

  const getRuleSet = async () => {
    setRuleSetLoading(true)

    try {
      const response = await fetch("/api/ruleset/get")
      let { data } = await response.json()

      setRuleSetLoading(false)
      data && data.price_rule && setRuleSet(data.price_rule)

      return data
    } catch (error) {
      console.log(error)
      setToastProps({
        content: "There was an error getting price rule",
        error: true,
      })
      setRuleSetLoading(false)
      setRuleSet(false)
    }
  }

  const synchronizeDiscounts = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/discounts/create")
      let data = await response.json()
      console.log('synchronizeDiscounts data', data)
      setIsLoading(false)
      // data && data.price_rule && setRuleSet(data.price_rule)
      setToastProps({
        content: "Synchronization has started",
        error: false,
      })
      return data
    } catch (error) {
      console.log(error)
      setToastProps({
        content: "There was an error synchronizing discounts",
        error: true,
      })
      setIsLoading(false)
    }
  }

  const getCustomerSegment = async () => {
    setCustSegmentLoading(true)

    try {
      const response = await fetch("/api/customer-segment/get")
      const { data } = await response.json()
      const segment = data?.data?.segment

      setCustSegmentLoading(false)
      segment && setSegment(segment)

      // console.log('getCustomerSegment response', segment)
      return segment
    } catch (error) {
      console.log(error)
      setToastProps({
        content: "There was an error getting customer segment",
        error: true,
      })
      setCustSegmentLoading(false)
      setSegmentActive(false)
    }
  }

  const toastMarkup = toastProps.content && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  )

  return (
    <Page>
      {toastMarkup}
      <Card
        title="Info"
        sectioned
      >
        {custSegmentLoading
          ? <SettingToggle>
            <SkeletonBodyText lines={1} />
          </SettingToggle>
          : <SettingToggle>
            {segment && segment.id ?
              <TextContainer spacing="loose">
                Customer segment: <TextStyle variation="strong">{segment?.name}</TextStyle> {' '}
                with query <TextStyle variation="strong">{segment.query}</TextStyle> {' '}
              </TextContainer>
              :
              <TextContainer spacing="loose">
                <InlineError message="Please add segment id to .env file CUSTOMER_SEGMENT_ID=" />
              </TextContainer>
            }
          </SettingToggle>
        }

        {ruleSetLoading
          ? <SettingToggle>
            <SkeletonBodyText lines={1} />
          </SettingToggle>
          : <SettingToggle>
            {ruleSet && ruleSet.id ? <>
              <TextContainer spacing="loose">
                Price rule: <TextStyle variation="strong">{ruleSet?.title}</TextStyle> {' '}
              </TextContainer>
              <TextContainer spacing="loose">
                Discount: <TextStyle variation="strong"> {ruleSet?.value} %</TextStyle>
              </TextContainer>
              <TextContainer spacing="loose">
                Once per customer: <TextStyle variation="strong"> {ruleSet?.once_per_customer ? 'true' : 'false'} </TextStyle>
              </TextContainer>
            </>
              :
              <TextContainer spacing="loose">
                <InlineError message="Please add correct discount price rule id to .env file DISCOUNTS_PRICE_RULE_ID=" />
              </TextContainer>
            }
          </SettingToggle>
        }

        {everflowdiscountsLoading
          ? <SettingToggle>
            <SkeletonBodyText lines={1} />
          </SettingToggle>
          : <SettingToggle>
            {everflowDiscounts
              ? <TextContainer spacing="loose">
                Everflow discounts count: <TextStyle variation="strong">{everflowDiscounts.length}</TextStyle>
              </TextContainer>
              : <TextContainer spacing="loose">
                <InlineError message="Please add everflow API keys to .env file (EVERFLOW_API_URL= and EVERFLOW_API_KEY=)" />
              </TextContainer>
            }
          </SettingToggle>
        }

        {discountsLoading
          ? <SettingToggle>
            <SkeletonBodyText lines={1} />
          </SettingToggle>
          : <SettingToggle>
            {discounts
              ? <TextContainer spacing="loose">
                Shopify discounts count: <TextStyle variation="strong">{discounts.length}</TextStyle>
              </TextContainer>
              : <TextContainer spacing="loose">
                <InlineError message="Please add correct discount price rule id to .env file (DISCOUNTS_PRICE_RULE_ID=)" />
              </TextContainer>
            }
          </SettingToggle>
        }
        <br />

        <Card title="Synchronize discounts" sectioned>
          {ruleSet && ruleSet.updated_at
            ? <p>Last updated: {humanReadableDate} </p>
            : null
          }

          {mismatchedDiscounts && mismatchedDiscounts.length
            ? <>
              <br />
              <p>Mismatched discounts: <TextStyle variation="strong">{mismatchedDiscounts.length}</TextStyle></p>
              <br />
              <Stack>
                {mismatchedDiscounts.map((discount, i) => {
                  if (i < 5) {
                    return (<Badge>{discount.coupon_code}</Badge>)
                  }
                })}

                {mismatchedDiscounts.length > 5
                  ? <Badge>and {mismatchedDiscounts.length - 5} more</Badge>
                  : null
                }
              </Stack>
            </>
            : null
          }
          <br />

          <Button loading={isLoading} disabled={!everflowDiscounts || !discounts || !mismatchedDiscounts.length} onClick={synchronizeDiscounts}>Sync</Button>
        </Card>
      </Card>
    </Page>
  )
}
