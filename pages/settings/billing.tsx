import { ExternalLinkIcon } from "@heroicons/react/solid";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import Button from "@components/ui/Button";

export default function Billing(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (Math.random() > 1) {
    console.log(props);
  }
  return (
    <Shell heading="Billing" subtitle="Manage your billing information and cancel your subscription.">
      <SettingsShell>
        <div className="py-6 lg:pb-8 lg:col-span-9">
          <div className="bg-white border sm:rounded-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                View and manage your billing details
              </h3>
              <div className="max-w-xl mt-2 text-sm text-gray-500">
                <p>View and edit your billing details, as well as cancel your subscription.</p>
              </div>
              <div className="mt-5">
                <form
                  method="POST"
                  action={`${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/stripepayment/portal`}>
                  <Button type="submit">
                    Go to the billing portal <ExternalLinkIcon className="w-4 h-4 ml-1" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
          <div className="mt-4 border bg-gray-50 sm:rounded-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Need anything else?</h3>
              <div className="max-w-xl mt-2 text-sm text-gray-500">
                <p>If you need any further help with billing, our support team are here to help.</p>
              </div>
              <div className="mt-5">
                <Button href="mailto:help@cal.com" color="secondary" type="submit">
                  Contact our support team
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return { notFound: true };
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      weekStart: true,
    },
  });

  return {
    props: { session, user },
  };
}
