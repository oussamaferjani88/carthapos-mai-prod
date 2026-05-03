import { useTranslation } from "react-i18next";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import BlogSkeleton from "@/components/skeletons/BlogSkeleton";

const Blog = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <BlogSkeleton />;
  }

  const posts = [
    {
      title: t('blogPage.posts.post1.title'),
      excerpt: t('blogPage.posts.post1.excerpt'),
      author: t('blogPage.posts.post1.author'),
      date: t('blogPage.posts.post1.date'),
      category: t('blogPage.posts.post1.category'),
      readTime: t('blogPage.posts.post1.readTime')
    },
    {
      title: t('blogPage.posts.post2.title'),
      excerpt: t('blogPage.posts.post2.excerpt'),
      author: t('blogPage.posts.post2.author'),
      date: t('blogPage.posts.post2.date'),
      category: t('blogPage.posts.post2.category'),
      readTime: t('blogPage.posts.post2.readTime')
    },
    {
      title: t('blogPage.posts.post3.title'),
      excerpt: t('blogPage.posts.post3.excerpt'),
      author: t('blogPage.posts.post3.author'),
      date: t('blogPage.posts.post3.date'),
      category: t('blogPage.posts.post3.category'),
      readTime: t('blogPage.posts.post3.readTime')
    },
    {
      title: t('blogPage.posts.post3.title'),
      excerpt: t('blogPage.posts.post3.excerpt'),
      author: t('blogPage.posts.post3.author'),
      date: "Nov 8, 2025",
      category: "Growth",
      readTime: "7 min read"
    },
    {
      title: t('blogPage.posts.post3.title'),
      excerpt: t('blogPage.posts.post3.excerpt'),
      author: "Product Team",
      date: "Nov 5, 2025",
      category: t('blogPage.categories.productUpdates'),
      readTime: "4 min read"
    },
    {
      title: t('blogPage.posts.post3.title'),
      excerpt: t('blogPage.posts.post3.excerpt'),
      author: "Security Team",
      date: "Nov 1, 2025",
      category: t('blogPage.categories.security'),
      readTime: "10 min read"
    }
  ];

  const categories = [
    t('blogPage.categories.all'),
    t('blogPage.categories.tutorial'),
    t('blogPage.categories.bestPractices'),
    t('blogPage.categories.technical'),
    t('blogPage.categories.productUpdates'),
    t('blogPage.categories.security')
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {t('blogPage.title')}
          </h1>
          <p className="text-xl text-text-muted max-w-3xl mx-auto">
            {t('blogPage.subtitle')}
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-6 lg:px-8 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <article
                key={index}
                className="bg-background rounded-2xl border border-border hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <p className="text-text-muted">Article Image</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold text-primary px-3 py-1 bg-primary/10 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-text-muted">{post.readTime}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-text-muted mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <Calendar className="w-4 h-4" />
                      <span>{post.date}</span>
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full mt-4 group">
                    {t('blogPage.readMore')}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </article>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button size="lg" variant="outline">
              {t('blogPage.loadMore')}
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('blogPage.newsletter.title')}
          </h2>
          <p className="text-lg text-text-muted mb-8">
            {t('blogPage.newsletter.description')}
          </p>
          <div className="flex gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder={t('blogPage.newsletter.placeholder')}
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background"
            />
            <Button size="lg">{t('blogPage.newsletter.cta')}</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Blog;
