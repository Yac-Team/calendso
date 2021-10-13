import { DefaultSeoProps } from "next-seo";

import { HeadSeoProps } from "@components/seo/head-seo";

const seoImages = {
  default: "https://meet.yac.com/og-image.png",
  ogImage: `https://ondemand.bannerbear.com/signedurl/${process.env.BB_SIGNED_URL_BASE_ID}/image.jpg`,
};

export const getSeoImage = (key: keyof typeof seoImages): string => {
  return seoImages[key];
};

export const seoConfig: {
  headSeo: Required<Pick<HeadSeoProps, "siteName">>;
  defaultNextSeo: DefaultSeoProps;
} = {
  headSeo: {
    siteName: "meet.yac.com",
  },
  defaultNextSeo: {
    twitter: {
      handle: "@yac",
      site: "@yac",
      cardType: "summary_large_image",
    },
  },
} as const;
