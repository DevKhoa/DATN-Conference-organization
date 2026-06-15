import CoreValues from "@/components/CoreValues";
import Hero from "@/components/Hero";
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
    </DefaultLayout>
  );
};

export default HomePage;
