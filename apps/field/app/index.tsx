import { Redirect } from 'expo-router';

/**
 * An auditor opens the app to see their own work (TND-95). Offers is one tab
 * along, for when they have none.
 */
export default function Index() {
  // Cast as the router.push calls do: expo-router's generated route union is
  // rebuilt by the dev server, so a freshly added route is not in it yet.
  return <Redirect href={'/home' as never} />;
}
