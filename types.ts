

export type PrivacySetting = 'public' | 'followers' | 'private';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  status: 'active' | 'suspended' | 'banned' | null;
  cover_photo_url: string | null;

  // New details fields
  gender: 'male' | 'female' | 'other' | null;
  place_of_origin: string | null;
  website: string | null;
  contact_info: string | null;
  education_level: string | null;

  // Privacy settings for new fields
  gender_privacy: PrivacySetting | null;
  place_of_origin_privacy: PrivacySetting | null;
  website_privacy: PrivacySetting | null;
  contact_info_privacy: PrivacySetting | null;
  education_level_privacy: PrivacySetting | null;
  
  // Chat Settings
  message_privacy: 'public' | 'followers' | 'private' | null;
  read_receipts_enabled: boolean | null;

  // Blocking
  blocked_users: string[];
  
}

export interface PostProfile {
  full_name: string | null;
  avatar_url: string | null;
}

export interface Like {
  user_id: string;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  profiles: PostProfile | null;
}

export interface Post {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  user_id: string;
  group_id: string | null;
  profiles: PostProfile | null;
  groups: { name: string } | null;
  likes: Like[];
  comments: [{ count: number }];
}

export interface StoreFollower {
  user_id: string;
}

export interface StoreRating {
  user_id: string;
  rating: number;
}

export interface Store {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  user_id: string;
  image_url: string | null;
  profiles: PostProfile | null;
  store_followers: StoreFollower[];
  store_ratings: StoreRating[];
}

export interface ProductLike {
  user_id: string;
}

export interface ProductComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  product_id: string;
  profiles: PostProfile | null;
}

export interface Product {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  store_id: string;
  user_id: string;
  profiles: PostProfile | null; // Product owner
  stores: { id: string, name: string } | null; // Store it belongs to
  product_likes: ProductLike[];
  product_comments: [{ count: number }];
}


export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  audio_url: string | null;
  read: boolean;
  deleted_for: string[] | null;
}

export interface Conversation {
  other_user_id: string;
  profile: Profile;
  last_message: Message;
  unread_count: number;
}

export interface Group {
    id: string;
    created_at: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    is_private: boolean;
    user_id: string; // owner
    profiles: PostProfile | null; // owner profile
    group_members: [{ count: number }];
}

export interface GroupMember {
    id: string;
    user_id: string;
    group_id: string;
    profiles: PostProfile | null;
}

export interface GroupPost extends Post {
    group_id: string;
}

export type NotificationType = 'like_post' | 'comment_post' | 'new_message' | 'like_product' | 'comment_product' | 'new_store_follower' | 'new_store_rating' | 'new_follower' | 'like_rental_post' | 'comment_rental_post' | 'admin_notification' | 'support_ticket_reply';

export interface Notification {
    id: string;
    created_at: string;
    user_id: string; // recipient
    actor_id: string; // the user who performed the action
    type: NotificationType;
    entity_id: string; // id of the post, message, etc.
    read: boolean;
    actors: PostProfile | null; // Profile of the actor
}

export interface CallSignal {
    type: 'offer' | 'answer' | 'ice-candidate' | 'hang-up';
    payload: any;
    senderId: string;
    receiverId: string;
}

export interface RentalPostLike {
  user_id: string;
}

export interface RentalPostComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string; // post_id refers to rental_post_id
  profiles: PostProfile | null;
}

export type PaymentTerm = 'monthly' | 'quarterly' | 'semi_annually';

export interface RentalPost {
  id: string;
  created_at: string;
  user_id: string;
  region: string;
  address: string;
  street_name: string;
  room_count: number;
  condition: string;
  image_urls: string[];
  rent_amount: number;
  payment_term: PaymentTerm;
  latitude: number | null;
  longitude: number | null;
  map_link: string | null;

  // Joined data
  profiles: PostProfile | null;
  rental_post_likes: RentalPostLike[];
  rental_post_comments: [{ count: number }];
}

export interface SupportTicket {
  id: string;
  created_at: string;
  user_id: string;
  problem_description: string;
  screenshot_urls: string[] | null;
  status: 'PENDING' | 'RESOLVED';
  // Joined data
  profiles: { full_name: string; avatar_url: string | null } | null; // reporter profile
  unread_admin_replies?: number;
}

export interface SupportTicketReply {
  id: string;
  created_at: string;
  ticket_id: string;
  user_id: string; // author_id
  content: string | null;
  image_urls: string[] | null;
  // Joined data
  profiles: { full_name: string; avatar_url: string | null; id: string } | null; // author profile
}
