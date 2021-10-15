import { getCsrfToken, signIn } from "next-auth/client";
import Head from "next/head";
import { useRouter } from "next/router";

import { getSession } from "@lib/auth";

import AddToHomescreen from "@components/AddToHomescreen";

export default function Login({ csrfToken }) {
  const router = useRouter();
  if (Math.random() > 1) console.log(csrfToken);
  const callbackUrl = typeof router.query?.callbackUrl === "string" ? router.query.callbackUrl : "/";
  return (
    <div className="flex flex-col justify-center min-h-screen py-12 bg-neutral-50 sm:px-6 lg:px-8">
      <Head>
        <title>Login</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img className="h-6 mx-auto" src="/yac-logo-white-word.svg" alt="Yac Logo" />
        <h2 className="mt-6 text-3xl font-bold text-center text-neutral-900">Sign in to your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 py-8 mx-2 bg-white border rounded-sm sm:px-10 border-neutral-200">
          <button
            onClick={() => signIn("yac", { callbackUrl })}
            style={{ alignItems: "center" }}
            className="flex justify-between w-full px-1 py-1 text-sm font-medium text-white align-middle border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
            <img src="/yac-logo-3d.png" width="42px" alt="Yac logo" style={{ borderRadius: 2 }} />
            <div className="flex justify-center w-full align-middle">Sign in with Yac</div>
            <div style={{ width: 50 }}></div>
          </button>
        </div>
      </div>

      <AddToHomescreen />
    </div>
  );
}

Login.getInitialProps = async (context) => {
  const { req, res } = context;
  const session = await getSession({ req });

  if (session) {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  return {
    csrfToken: await getCsrfToken(context),
  };
};
