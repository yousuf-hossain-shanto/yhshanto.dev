export type Image = {
    src: string;
    alt?: string;
    caption?: string;
};

export type Link = {
    text: string;
    href: string;
};

export type Hero = {
    title?: string;
    text?: string;
    image?: Image;
    actions?: Link[];
};

export type Subscribe = {
    title?: string;
    text?: string;
    formUrl: string;
};

export type SiteConfig = {
    logo?: Image;
    title: string;
    subtitle?: string;
    description: string;
    image?: Image;
    headerNavLinks?: Link[];
    footerNavLinks?: Link[];
    socialLinks?: Link[];
    hero?: Hero;
    subscribe?: Subscribe;
    postsPerPage?: number;
    projectsPerPage?: number;
};

const siteConfig: SiteConfig = {
    title: 'Yaxis',
    subtitle: 'Fueling Innovation Through Expert Backend Solutions.',
    description: 'Welcome to my digital hub where innovation meets expertise! With a passion for crafting robust backend solutions, I specialize in architecting cutting-edge applications and dApps, empowering businesses to thrive in the digital realm. Let\'s collaborate and build the future together!',
    image: {
        src: '/hero.jpg',
        alt: 'Yaxis - Fueling Innovation Through Expert Backend Solutions.'
    },
    headerNavLinks: [
        {
            text: 'Home',
            href: '/'
        },
        // {
        //     text: 'Projects',
        //     href: '/projects'
        // },
        {
            text: 'Blog',
            href: '/blog'
        },
        {
            text: 'Tags',
            href: '/tags'
        }
    ],
    footerNavLinks: [
        {
            text: 'About',
            href: '/about'
        },
        {
            text: 'Contact',
            href: '/contact'
        },
        {
            text: 'Terms',
            href: '/terms'
        }
    ],
    socialLinks: [
        // {
        //     text: 'Dribbble',
        //     href: 'https://dribbble.com/'
        // },
        {
            text: 'Facebook',
            href: 'https://fb.me/yhshanto'
        },
        {
            text: 'X/Twitter',
            href: 'https://twitter.com/yousufhshanto'
        }
    ],
    hero: {
        title: 'Hi There & Welcome to My Corner of the Web!',
        text: "I'm **YH Shanto**, a backend developer at TubeOnAI, dedicated to the realms of collaboration and artificial intelligence. My approach involves embracing intuition, conducting just enough research, and leveraging aesthetics as a catalyst for exceptional products. I have a profound appreciation for top-notch software, visual design, and the principles of backend-led growth. Feel free to explore some of my coding endeavors on <a href='https://github.com/yousuf-hossain-shanto'>GitHub</a> or follow me on <a href='https://twitter.com/yousufhshanto'>Twitter/X</a>.",
        image: {
            src: '/hero.jpg',
            alt: 'A person sitting at a desk in a countryside restaurent down to a warm light'
        },
        actions: [
            {
                text: 'Get in Touch',
                href: '/contact'
            }
        ]
    },
    subscribe: {
        title: 'Subscribe to Yaxis Newsletter',
        text: 'One update per week. All the latest posts directly in your inbox.',
        formUrl: '#'
    },
    postsPerPage: 8,
    projectsPerPage: 8
};

export default siteConfig;
