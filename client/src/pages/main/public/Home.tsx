import CallToAction from "@/components/CallToAction";
import CoreValues from "@/components/CoreValues";
import Features from "@/components/Features";
import Hero from "@/components/Hero";
import Partners from "@/components/Partners";
import { DefaultLayout } from "@/layouts/DefaultLayout";

const HomePage = () => {
  return (
    <DefaultLayout
      meta={{
        title: "ConfManage Home",
      }}
    >
      <Hero />
      <CoreValues />
      <Features />
      <Partners />
      <CallToAction />
    </DefaultLayout>
  );
};

export default HomePage;
