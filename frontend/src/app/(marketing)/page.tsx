'use client'

import ScrollProgressLine from '@/views/marketing/scroll-progress-line'
import HeroSection from '@/views/marketing/hero-section'
import VideoDemoSection from '@/views/marketing/video-demo-section'
import TechStackSection from '@/views/marketing/tech-stack-section'
import ActionShowcaseSection from '@/views/marketing/action-showcase-section'
import VisualDesignSection from '@/views/marketing/visual-design-section'
import GoogleFontsSection from '@/views/marketing/google-fonts-section'
import SecuritySection from '@/views/marketing/security-section'
import DocumentTypesSection from '@/views/marketing/document-types-section'
import ComparisonSection from '@/views/marketing/comparison-section'
import SupportersSection from '@/views/marketing/supporters-section'
import RoadmapSection from '@/views/marketing/roadmap-section'
import FAQSection from '@/views/marketing/faq-section'
import CTASection from '@/views/marketing/cta-section'

export default function HomePage() {
  return (
    <div className='font-sans'>
      <ScrollProgressLine />
      <HeroSection />
      <TechStackSection />
      <VideoDemoSection />
      <VisualDesignSection />
      <ActionShowcaseSection />
      <GoogleFontsSection />
      <SecuritySection />
      <DocumentTypesSection />
      <ComparisonSection />
      <SupportersSection />
      <RoadmapSection />
      <FAQSection />
      <CTASection />
    </div>
  )
}
