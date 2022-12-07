import { TitleBar, Loading } from "@shopify/app-bridge-react";
import {
  Card, EmptyState, Layout, Page, SkeletonBodyText, TextField, Banner, Button 
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from 'react';
import { useAuthenticatedFetch } from "../hooks";

export default function HomePage() {
  const [percentage, setPercentage] = useState(0);
  const [isCouponGetted, setIsCouponGetted] = useState(false);
  const [couponList, setCouponList] = useState(['XX-XX-XX-XX']);
  const [isLoading, setIsLoading] = useState(false);
	const authenticatedFetch = useAuthenticatedFetch();
  const changePercentage = useCallback((newValue) => setPercentage(newValue), []);

  useEffect(() => {
    setIsLoading(false);
  }, [couponList]);

  const savePercentage = async () => {
    console.log(`Current percent: ${percentage}`);
    const response = await authenticatedFetch("/api/products/count", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    console.log(response);
  }

  const getCoupons = async () => {
    setIsCouponGetted(true);
    setIsLoading(true);

    const response = await authenticatedFetch("/admin/api/2022-10/price_rules/1375355470114/discount_codes/1375355470114.json", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    // const response = await authenticatedFetch("/admin/api/2022-10/price_rules/1375355470114/discount_codes.json", {
    //   method: "GET",
    //   headers: { "Content-Type": "application/json" }
    // });

    console.log(response);

    response.status === 200 ? setCouponList(response) : setCouponList(['Custom code: 31-32-51-64']);
  }

  return (
    <Page>
      <TitleBar
        title="Discont coupones"
      />
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Button primary fullWidth onClick={getCoupons}>Sync discount</Button>
              { isLoading ? 
                <Card sectioned>
                  <Loading />
                  <SkeletonBodyText />
                </Card>
                :
                <div style={{ marginTop: "20px" }}>{
                  isCouponGetted ? (
                    <Card sectioned>
                      <b>Received coupons: {couponList.length}</b>
                      <ul style={{ maxHeight: '100px', overflowY: 'auto'}}>
                        {
                          couponList.map(el => <li key={el}>{el}</li>)
                        }
                      </ul>
                    </Card>
                  ) : (
                    <Banner title="You have not a coupon">
                      <p>{couponList[0]}</p>
                    </Banner>
                  )
                }</div>
              }
            <EmptyState
              heading="Change percentage value for your discount:"
              action={{
                content: "Save",
                onAction: () => savePercentage(),
              }}
            >
              <TextField
                type="number"
                value={percentage}
                onChange={changePercentage}
                autoComplete="off"
              /> 
            </EmptyState>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
