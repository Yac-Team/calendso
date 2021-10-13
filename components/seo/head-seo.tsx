import base64url from "base64url";
import { createHmac } from "crypto";
import merge from "lodash.merge";
import { NextSeo, NextSeoProps } from "next-seo";
import React from "react";

import { getSeoImage, seoConfig } from "@lib/config/next-seo.config";
import { getBrowserInfo } from "@lib/core/browser/browser.utils";

export type HeadSeoProps = {
  title: string;
  description: string;
  siteName?: string;
  name?: string;
  avatar?: string;
  url?: string;
  canonical?: string;
  nextSeoProps?: NextSeoProps;
};

/**
 * Build full seo tags from title, desc, canonical and url
 */
const buildSeoMeta = (pageProps: {
  title: string;
  description: string;
  image: string;
  siteName?: string;
  url?: string;
  canonical?: string;
}): NextSeoProps => {
  const { title, description, image, canonical, siteName = seoConfig.headSeo.siteName } = pageProps;
  return {
    title: title,
    canonical: canonical,
    openGraph: {
      site_name: siteName,
      type: "website",
      title: title,
      description: description,
      images: [
        {
          url: image,
          //width: 1077,
          //height: 565,
          //alt: "Alt image"
        },
      ],
    },
    additionalMetaTags: [
      {
        property: "name",
        content: title,
      },
      {
        property: "description",
        content: description,
      },
      {
        name: "description",
        content: description,
      },
      {
        property: "image",
        content: image,
      },
    ],
  };
};

const constructImage = (name: string, avatar: string, description: string): string => {
  //api_key: your project API key - keep this safe and non-public
  const api_key = process.env.BB_API_KEY;

  //base: this signed url base
  const base = `https://ondemand.bannerbear.com/signedurl/${process.env.BB_SIGNED_URL_BASE_ID}/image.jpg`;

  //modifications: grab this JSON from your template API Console and modify as needed
  const modifications = [
    {
      name: "user_image",
      image_url: avatar,
    },
    {
      name: "subject",
      text: `Meet ${name} on Yac Meet`,
      color: null,
      background: null,
    },
    {
      name: "channel",
      text: description,
      color: null,
      background: null,
    },
  ];

  //create the query string
  const query = "?modifications=" + base64url(JSON.stringify(modifications));

  //calculate the signature

  const signature = createHmac("sha256", api_key as string)
    .update(base + query)
    .digest("hex");

  //append the signature
  return String(query + "&s=" + signature);
};

export const HeadSeo: React.FC<HeadSeoProps & { children?: never }> = (props) => {
  const defaultUrl = getBrowserInfo()?.url;
  const image = getSeoImage("default");

  const {
    title,
    description,
    name = null,
    avatar = null,
    siteName,
    canonical = defaultUrl,
    nextSeoProps = {},
  } = props;

  const pageTitle = title + " | Yac Meet";
  let seoObject = buildSeoMeta({ title: pageTitle, image, description, canonical, siteName });

  if (name && avatar) {
    let pageImage = image;
    try {
      pageImage = getSeoImage("ogImage") + constructImage(name, avatar, description);
    } catch (error) {
      console.error("Error generating ogImage");
      console.error({ error });
    }
    seoObject = buildSeoMeta({
      title: pageTitle,
      description,
      image: pageImage,
      canonical,
      siteName,
    });
  }

  const seoProps: NextSeoProps = merge(nextSeoProps, seoObject);
  return <NextSeo {...seoProps} />;
};
