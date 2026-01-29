import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service — PocketMolt",
  description: "Terms of Service for PocketMolt.",
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.04] bg-black/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center">
          <Link href="/" className="font-display text-lg font-semibold">
            PocketMolt
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-16 md:py-24">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: January 29, 2025</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using PocketMolt (&quot;the Service&quot;), you agree to be bound by these Terms of
              Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p className="mt-2">
              PocketMolt provides tools to configure and deploy MoltBot instances. The Service is provided on an
              &quot;as is&quot; and &quot;as available&quot; basis.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">3. Disclaimer of Warranties</h2>
            <p className="mt-2">
              The Service is provided without warranties of any kind, whether express or implied, including but not
              limited to implied warranties of merchantability, fitness for a particular purpose, and
              non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">4. Limitation of Liability</h2>
            <p className="mt-2">
              To the fullest extent permitted by applicable law, PocketMolt and its owners, operators, affiliates,
              and contributors shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits, data, use, or goodwill, arising out of or in connection with your
              access to or use of (or inability to use) the Service, whether based on warranty, contract, tort
              (including negligence), or any other legal theory, even if we have been advised of the possibility of
              such damages.
            </p>
            <p className="mt-2">
              In no event shall our total liability exceed the amount you paid us, if any, in the twelve (12)
              months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">5. Use at Your Own Risk</h2>
            <p className="mt-2">
              You acknowledge that your use of the Service, including any bots deployed through PocketMolt, is
              entirely at your own risk. You are solely responsible for compliance with any third-party terms of
              service, including but not limited to Discord&apos;s Terms of Service and Developer Policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">6. Indemnification</h2>
            <p className="mt-2">
              You agree to indemnify and hold harmless PocketMolt and its team from any claims, damages, losses, or
              expenses (including reasonable legal fees) arising from your use of the Service or violation of these
              Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">7. Third-Party Services</h2>
            <p className="mt-2">
              PocketMolt may integrate with third-party services. We are not responsible for the availability,
              accuracy, or content of any third-party service, and your use of such services is governed by their
              respective terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">8. Modifications</h2>
            <p className="mt-2">
              We reserve the right to modify these Terms at any time. Continued use of the Service after changes
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">9. Governing Law</h2>
            <p className="mt-2">
              These Terms shall be governed by and construed in accordance with applicable law, without regard to
              conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">10. Contact</h2>
            <p className="mt-2">
              For questions about these Terms, please reach out via the contact information on our website.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
