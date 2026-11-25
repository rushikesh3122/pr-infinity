import { router, type Href } from 'expo-router';

/** Go back if there is a previous screen (e.g. not opened from a deep link), else go to a sensible parent. */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
