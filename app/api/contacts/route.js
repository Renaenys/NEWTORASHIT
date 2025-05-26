import { connectDB } from "@/lib/dbConnect";
import Contact from "@/models/Contact";

export async function GET(request) {
  await connectDB();
  try {
    const contacts = await Contact.find().sort({ name: 1 });
    return new Response(JSON.stringify(contacts), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), {
      status: 500,
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const contact = await Contact.create(data);
    return new Response(JSON.stringify(contact), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to create contact" }), {
      status: 500,
    });
  }
}

export async function PUT(request) {
  try {
    const { id, ...data } = await request.json();
    const contact = await Contact.findByIdAndUpdate(id, data, { new: true });
    if (!contact)
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404,
      });
    return new Response(JSON.stringify(contact), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to update contact" }), {
      status: 500,
    });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return new Response(JSON.stringify({ error: "No ID provided" }), {
        status: 400,
      });
    const contact = await Contact.findByIdAndDelete(id);
    if (!contact)
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404,
      });
    return new Response(JSON.stringify({ message: "Contact deleted" }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to delete contact" }), {
      status: 500,
    });
  }
}
