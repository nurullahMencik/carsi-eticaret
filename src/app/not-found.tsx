import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { NotFoundContent } from "@/components/store/not-found-content";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
