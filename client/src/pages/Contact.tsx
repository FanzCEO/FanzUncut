import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  MessageCircle, 
  Phone,
  MapPin,
  Clock,
  Send,
  HelpCircle,
  Shield,
  Zap,
  Users
} from 'lucide-react';

const ContactMethod = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  available = true 
}: {
  icon: any;
  title: string;
  description: string;
  action: string;
  available?: boolean;
}) => (
  <Card className={`hover:shadow-lg transition-all duration-200 ${available ? 'cursor-pointer hover:border-primary/20' : 'opacity-60'}`}>
    <CardContent className="p-6 text-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
        available ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      }`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-medium">{action}</span>
        {available && <Badge variant="outline" className="text-xs">Available</Badge>}
        {!available && <Badge variant="secondary" className="text-xs">Coming Soon</Badge>}
      </div>
    </CardContent>
  </Card>
);

const FAQ = () => {
  const faqs = [
    {
      question: "How do I start earning as a creator?",
      answer: "Sign up as a creator, complete your profile, set your subscription price, and start uploading content. You can earn through subscriptions, tips, premium posts, and live streaming."
    },
    {
      question: "What are the platform fees?",
      answer: "BoyFanz operates on a 100% creator earnings program - we take 0% platform fees. You only pay standard payment processing fees (around 2.9%)."
    },
    {
      question: "How do payouts work?",
      answer: "You can request payouts anytime once you reach the minimum threshold. Payments are processed within 3-5 business days to your linked PayPal or bank account."
    },
    {
      question: "Is my content protected?",
      answer: "Yes, all content is protected with digital watermarking, screenshot detection, and strict DMCA policies. We take content protection seriously."
    },
    {
      question: "How do I verify my account?",
      answer: "Upload a government-issued ID through our secure KYC process. Verified creators get a badge and access to additional features."
    }
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-start gap-2">
              <HelpCircle className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
              {faq.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground pl-6">{faq.answer}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
      });
      
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="contact-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            Get in Touch
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions? Need help? We're here to support creators and fans every step of the way.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <ContactMethod
            icon={MessageCircle}
            title="Live Chat"
            description="Chat with our support team in real-time"
            action="Start Chat"
            available={true}
          />
          <ContactMethod
            icon={Mail}
            title="Email Support"
            description="Get detailed help via email"
            action="support@boyfanz.com"
            available={true}
          />
          <ContactMethod
            icon={Phone}
            title="Phone Support"
            description="Speak directly with our team"
            action="Call Now"
            available={false}
          />
          <ContactMethod
            icon={Users}
            title="Community"
            description="Join our creator community forum"
            action="Visit Forum"
            available={false}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Your name"
                        required
                        data-testid="contact-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your@email.com"
                        required
                        data-testid="contact-email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <select 
                      className="w-full p-2 border border-border rounded-md bg-background"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      data-testid="contact-category"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="creator">Creator Support</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing & Payments</option>
                      <option value="content">Content & Moderation</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Brief description of your inquiry"
                      required
                      data-testid="contact-subject"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Tell us how we can help you..."
                      className="min-h-[120px]"
                      required
                      data-testid="contact-message"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                    data-testid="contact-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Support Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Support Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Monday - Friday</span>
                  <span className="text-sm font-medium">9 AM - 8 PM EST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Saturday</span>
                  <span className="text-sm font-medium">10 AM - 6 PM EST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Sunday</span>
                  <span className="text-sm font-medium">12 PM - 5 PM EST</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">Currently Online</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="bg-red-500/5 border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Shield className="h-5 w-5" />
                  Emergency Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  For urgent security issues or content violations
                </p>
                <Button variant="outline" size="sm" className="w-full border-red-500/20 hover:bg-red-500/10">
                  <Zap className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </CardContent>
            </Card>

            {/* Office Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Our Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">BoyFanz HQ</p>
                <p className="text-sm text-muted-foreground">
                  123 Creator Street<br />
                  Digital District, CA 90210<br />
                  United States
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto">
            <FAQ />
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <CardContent className="p-6">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Help Center</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browse our comprehensive help articles
              </p>
              <Button variant="outline" size="sm">Visit Help Center</Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Creator Resources</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tools and guides for content creators
              </p>
              <Button variant="outline" size="sm">View Resources</Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Safety Center</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Learn about our safety and security measures
              </p>
              <Button variant="outline" size="sm">Learn More</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}