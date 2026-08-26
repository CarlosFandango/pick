import { Redirect } from 'expo-router';

/** Offers are what an auditor opens the app for. */
export default function Index() {
  return <Redirect href="/offers" />;
}
