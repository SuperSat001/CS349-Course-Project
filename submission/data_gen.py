n = 100

with open("public/sample_data_2.sql", "w") as f:
    f.write("INSERT INTO my_table (id, name) VALUES\n")
    for i in range(1, n + 1):
        line = f"  ({i}, 'Name_{i}')"
        line += "," if i < n else ";\n"
        f.write(line + "\n")