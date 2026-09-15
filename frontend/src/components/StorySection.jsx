import avatar1 from '../assets/images/avatar-1.jpg';
import avatar2 from '../assets/images/avatar-2.jpg';
import avatar3 from '../assets/images/avatar-3.jpg';
import avatar4 from '../assets/images/avatar-4.jpg';
import stories from '../data/stories.js';

const storyImages = import.meta.glob('../assets/images/story-*.jpg', { eager: true, import: 'default' });

function resolveStoryImage(filename) {
  const match = Object.entries(storyImages).find(([path]) => path.endsWith(`/${filename}`));
  return match ? match[1] : '';
}

export default function StorySection() {
  return (
    <section className="section story" aria-labelledby="story-label">
      <div className="container">
        <div className="title-wrapper">
          <div>
            <p className="section-subtitle title-medium">Student Stories</p>

            <h2 className="section-title headline-medium" id="story-label">We help 1,200+ students find their perfect room and home</h2>

            <ul className="avatar-list" aria-hidden="true">
              <li className="avatar">
                <img src={avatar1} width="120" height="80" loading="lazy" alt="" className="img-cover" />
              </li>
              <li className="avatar">
                <img src={avatar2} width="120" height="80" loading="lazy" alt="" className="img-cover" />
              </li>
              <li className="avatar">
                <img src={avatar3} width="120" height="80" loading="lazy" alt="" className="img-cover" />
              </li>
              <li className="avatar">
                <img src={avatar4} width="120" height="80" loading="lazy" alt="" className="img-cover" />
                <div className="overlay-content">
                  <span className="label-medium">99+</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <ul className="story-list">
          {stories.map((story) => (
            <li
              className="story-card"
              key={story.name}
              style={{ backgroundImage: `url(${resolveStoryImage(story.bg)})` }}
            >
              <div className="overlay-content">
                <div>
                  <h3 className="title-small">{story.name.replace('Student: ', '')}</h3>

                  <div className="rating-wrapper">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span className="material-symbols-rounded" aria-hidden="true" key={i}>star</span>
                    ))}
                    <data className="title-small rating-text" value="5">5.0</data>
                  </div>
                </div>

                <figure className="card-avatar">
                  <img src={resolveStoryImage(story.avatar)} width="56" height="56" loading="lazy" alt={story.avatarAlt} className="img-cover" />
                </figure>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
