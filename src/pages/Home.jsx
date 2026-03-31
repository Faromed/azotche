import Hero from '../components/Hero';
import Features from '../components/Features';
import Categories from '../components/Categories';
import HowItWorks from '../components/HowItWorks';
import Stats from '../components/Stats';
import DownloadSection from '../components/DownloadSection';
import ShareSection from '../components/ShareSection';
import HomeFAQ from '../components/HomeFAQ';

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Categories />
      <HowItWorks />
      <Stats />
      <DownloadSection />
      <ShareSection />
      <HomeFAQ />
    </>
  );
}