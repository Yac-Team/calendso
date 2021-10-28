export default function Logo({ small }: { small?: boolean }) {
  return (
    <h1 className="inline brand-logo">
      <strong>
        <img
          className={"inline dark:hidden " + (small ? "h-4 w-auto" : "h-5 w-auto")}
          alt="Yac Logo"
          title="Yac"
          src="/yac-logo-word.svg"
        />
        <img
          className={"hidden dark:inline " + (small ? "h-4 w-auto" : "h-5 w-auto")}
          alt="Yac Logo"
          title="Yac"
          src="/yac-logo-white-word.svg"
        />
      </strong>
    </h1>
  );
}
